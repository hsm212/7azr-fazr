'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  doc, onSnapshot, setDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import type { GameState, Question } from '@/types/game'

export function genRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function createRoom(
  roomId:    string,
  teamAName: string,
  teamBName: string,
): Promise<void> {
  const initial: Omit<GameState, 'roomId'> = {
    teamA:         { name: teamAName || 'فريق ألفا', score: 0 },
    teamB:         { name: teamBName || 'فريق بيتا', score: 0 },
    categories:    [],
    answered:      {},
    turn:          'a',
    activeCard:    null,
    phase:         'draft',
    usedLifelines: { a: [], b: [] },
    isPit:         false,
    createdAt:     Date.now(),
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

    // Safety timeout — if Firestore doesn't respond in 8s, show an error
    const timeout = setTimeout(() => {
      setLoading(false)
      setError('تعذر الاتصال بـ Firebase — تحقق من إعدادات المشروع')
    }, 8000)

    const unsub = onSnapshot(
      doc(getDb(), 'games', roomId),
      (snap) => {
        clearTimeout(timeout)
        if (snap.exists()) {
          setGame(snap.data() as GameState)
          setError(null)
        } else {
          setError('الغرفة غير موجودة')
        }
        setLoading(false)
      },
      (err) => {
        clearTimeout(timeout)
        setError(err.message)
        setLoading(false)
      },
    )
    return () => { unsub(); clearTimeout(timeout) }
  }, [roomId])

  const patch = useCallback(
    (data: Record<string, unknown>) =>
      updateDoc(doc(getDb(), 'games', roomId), data),
    [roomId],
  )

  const setCategories = useCallback(
    (categories: string[]) =>
      patch({ categories, phase: categories.length === 6 ? 'game' : 'draft' }),
    [patch],
  )

  const openCard = useCallback(
    (cardKey: string) => patch({ activeCard: cardKey }),
    [patch],
  )

  const awardPoints = useCallback(
    async (team: 'a' | 'b', cardKey: string, pts: number) => {
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
          turn:                    team === 'a' ? 'b' : 'a',
        })
        return
      }

      await patch({
        [`answered.${cardKey}`]: team,
        [scoreField]:            prevScore + pts,
        activeCard:              null,
        turn:                    team === 'a' ? 'b' : 'a',
      })
    },
    [game, patch],
  )

  const cancelCard = useCallback(
    (cardKey: string) =>
      patch({
        [`answered.${cardKey}`]: 'x',
        activeCard:              null,
        turn:                    game?.turn === 'a' ? 'b' : 'a',
      }),
    [game, patch],
  )

  const useLifeline = useCallback(
    (team: 'a' | 'b', type: string) => {
      if (!game) return
      const current = game.usedLifelines[team]
      if (current.includes(type)) return
      const update: Record<string, unknown> = {
        [`usedLifelines.${team}`]: [...current, type],
      }
      if (type === 'pit') update.isPit = true
      return patch(update)
    },
    [game, patch],
  )

  const endGame = useCallback(
    () => patch({ phase: 'ended', activeCard: null }),
    [patch],
  )

  return { game, loading, error, setCategories, openCard, awardPoints, cancelCard, useLifeline, endGame, patch }
}

export async function fetchQuestions(categoryId: string): Promise<Question[]> {
  try {
    const snap = await getDocs(collection(getDb(), 'questions', categoryId, 'items'))
    const all  = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))

    // If Firestore has enough questions, use them (shuffled)
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

  // Fallback: use LOCAL_QB built into the app (always available, no Firestore needed)
  const { LOCAL_QB } = await import('@/lib/categories')
  const local = LOCAL_QB[categoryId] ?? []
  const shuffled = [...local]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 6).map(q => ({ q: q.q, a: q.a }))
}

export async function saveQuestion(categoryId: string, q: string, a: string): Promise<void> {
  await addDoc(collection(getDb(), 'questions', categoryId, 'items'), { q, a })
}

export async function deleteQuestion(categoryId: string, questionId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'questions', categoryId, 'items', questionId))
}

export async function fetchAllQuestions(categoryId: string): Promise<Question[]> {
  const snap = await getDocs(collection(getDb(), 'questions', categoryId, 'items'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
}
