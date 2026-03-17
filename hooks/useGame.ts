'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  doc, onSnapshot, setDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc, getDoc,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import type { GameState, Question, Category, Difficulty } from '@/types/game'
import { LOCAL_QB, BUILT_IN_CATS, DIFFICULTY_POINTS } from '@/lib/categories'

export function genRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function createRoom(roomId: string, teamAName: string, teamBName: string): Promise<void> {
  const initial: Omit<GameState, 'roomId'> = {
    teamA:            { name: teamAName || 'فريق ألفا', score: 0 },
    teamB:            { name: teamBName || 'فريق بيتا', score: 0 },
    categories:       [],
    questions:        {},
    answered:         {},
    turn:             'a',
    activeCard:       null,
    activeCardAnswer: null,
    phase:            'draft',
    usedLifelines:    { a: [], b: [] },
    isPit:            false,
    createdAt:        Date.now(),
  }
  await setDoc(doc(getDb(), 'games', roomId), { roomId, ...initial })
}

export function useGame(roomId: string) {
  const [game, setGame]       = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) return
    setLoading(true)
    const timeout = setTimeout(() => {
      setLoading(false)
      setError('تعذر الاتصال بـ Firebase — تحقق من إعدادات المشروع')
    }, 8000)
    const unsub = onSnapshot(
      doc(getDb(), 'games', roomId),
      (snap) => {
        clearTimeout(timeout)
        if (snap.exists()) { setGame(snap.data() as GameState); setError(null) }
        else setError('الغرفة غير موجودة')
        setLoading(false)
      },
      (err) => { clearTimeout(timeout); setError(err.message); setLoading(false) },
    )
    return () => { unsub(); clearTimeout(timeout) }
  }, [roomId])

  const patch = useCallback(
    (data: Record<string, unknown>) => updateDoc(doc(getDb(), 'games', roomId), data),
    [roomId],
  )

  const setCategories = useCallback(
    (categories: string[]) =>
      patch({ categories, phase: categories.length === 6 ? 'game' : 'draft' }),
    [patch],
  )

  const openCard = useCallback(
    (cardKey: string) => patch({ activeCard: cardKey, activeCardAnswer: null }),
    [patch],
  )

  const awardPoints = useCallback(
    async (team: 'a' | 'b', cardKey: string, pts: number, answer: string) => {
      if (!game) return
      const scoreField = team === 'a' ? 'teamA.score' : 'teamB.score'
      const prevScore  = team === 'a' ? game.teamA.score : game.teamB.score
      if (game.isPit) {
        const opp      = team === 'a' ? 'b' : 'a'
        const oppField = opp === 'a' ? 'teamA.score' : 'teamB.score'
        const oppScore = opp === 'a' ? game.teamA.score : game.teamB.score
        await patch({
          [`answered.${cardKey}`]: team,
          [oppField]:              Math.max(0, oppScore - pts),
          isPit:                   false,
          activeCard:              null,
          activeCardAnswer:        answer,
          turn:                    team === 'a' ? 'b' : 'a',
        })
        return
      }
      await patch({
        [`answered.${cardKey}`]: team,
        [scoreField]:            prevScore + pts,
        activeCard:              null,
        activeCardAnswer:        answer,
        turn:                    team === 'a' ? 'b' : 'a',
      })
    },
    [game, patch],
  )

  const cancelCard = useCallback(
    (cardKey: string, answer: string) =>
      patch({
        [`answered.${cardKey}`]: 'x',
        activeCard:              null,
        activeCardAnswer:        answer,
        turn:                    game?.turn === 'a' ? 'b' : 'a',
      }),
    [game, patch],
  )

  // Reveal answer to all without closing the card
  const revealAnswer = useCallback(
    (answer: string) => patch({ activeCardAnswer: answer }),
    [patch],
  )

  const useLifeline = useCallback(
    (team: 'a' | 'b', type: string) => {
      if (!game) return
      const current = game.usedLifelines[team]
      if (current.includes(type)) return
      const update: Record<string, unknown> = { [`usedLifelines.${team}`]: [...current, type] }
      if (type === 'pit') update.isPit = true
      return patch(update)
    },
    [game, patch],
  )

  const endGame = useCallback(() => patch({ phase: 'ended', activeCard: null }), [patch])

  return { game, loading, error, setCategories, openCard, awardPoints, cancelCard, revealAnswer, useLifeline, endGame, patch }
}

// ── Question bank ─────────────────────────────────────────────────────────────

export async function fetchQuestions(categoryId: string): Promise<Question[]> {
  try {
    const snap = await getDocs(collection(getDb(), 'questions', categoryId, 'items'))
    const all  = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
    if (all.length >= 6) {
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]]
      }
      return all.slice(0, 6)
    }
  } catch (e) {
    console.warn('Firestore fetch failed, using local fallback:', e)
  }
  const local = (LOCAL_QB[categoryId] ?? []).map(q => ({ ...q }))
  for (let i = local.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [local[i], local[j]] = [local[j], local[i]]
  }
  return local.slice(0, 6)
}

export async function saveQuestion(categoryId: string, q: string, a: string, difficulty: Difficulty): Promise<void> {
  await addDoc(collection(getDb(), 'questions', categoryId, 'items'), { q, a, difficulty })
}

export async function updateQuestion(categoryId: string, questionId: string, q: string, a: string, difficulty: Difficulty): Promise<void> {
  await updateDoc(doc(getDb(), 'questions', categoryId, 'items', questionId), { q, a, difficulty })
}

export async function deleteQuestion(categoryId: string, questionId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'questions', categoryId, 'items', questionId))
}

export async function fetchAllQuestions(categoryId: string): Promise<Question[]> {
  const snap = await getDocs(collection(getDb(), 'questions', categoryId, 'items'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
}

// ── Custom categories ─────────────────────────────────────────────────────────

export async function saveCustomCategory(cat: Omit<Category, 'id' | 'custom'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'categories'), { ...cat, custom: true })
  return ref.id
}

export async function fetchCustomCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(getDb(), 'categories'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))
  } catch { return [] }
}

export async function deleteCustomCategory(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'categories', id))
}

export async function fetchAllCategories(): Promise<Category[]> {
  const custom = await fetchCustomCategories()
  return [...BUILT_IN_CATS, ...custom]
}
