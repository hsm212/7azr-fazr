'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  doc, onSnapshot, setDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc,
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
      setError('تعذر الاتصال بـ Firebase')
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
  let pool: Question[] = []
  try {
    const snap = await getDocs(collection(getDb(), 'questions', categoryId, 'items'))
    const all  = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
    if (all.length >= 6) pool = all
  } catch (e) {
    console.warn('Firestore fetch failed, using local fallback:', e)
  }
  if (pool.length < 6) {
    pool = (LOCAL_QB[categoryId] ?? []).map(q => ({ ...q }))
  }
  const selected = balancedSelect(pool)
  // Fixed display order: 2 medium → 2 easy → 2 hard (rows 0-1, 2-3, 4-5)
  const order: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
  selected.sort((a, b) => (order[a.difficulty ?? 'easy'] ?? 1) - (order[b.difficulty ?? 'easy'] ?? 1))
  return selected
}

/**
 * Selects 6 questions with balanced difficulty.
 *
 * Slot allocation depends on how many tiers have questions:
 *   3 tiers available → 2 easy + 2 medium + 2 hard
 *   2 tiers available → 3 + 3  (e.g. 3 easy + 3 hard if no medium)
 *   1 tier available  → 6 of that tier
 *
 * Within each tier, questions are shuffled randomly.
 * If a tier can't fill its allocated slots, remaining slots go to other tiers
 * (hard first to maximise points, easy as last resort).
 */
function balancedSelect(pool: Question[]): Question[] {
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const easy   = shuffle(pool.filter(q => (q.difficulty ?? 'easy') === 'easy'))
  const medium = shuffle(pool.filter(q => q.difficulty === 'medium'))
  const hard   = shuffle(pool.filter(q => q.difficulty === 'hard'))

  // How many tiers actually have questions?
  const tiers = [easy, medium, hard].filter(t => t.length > 0)
  const slotsPerTier = tiers.length === 0 ? 0
                     : tiers.length === 1 ? 6
                     : tiers.length === 2 ? 3
                     : 2  // 3 tiers → 2 each

  // Allocate slots — each tier gets slotsPerTier (capped by availability)
  const eSlots = Math.min(slotsPerTier, easy.length)
  const mSlots = Math.min(slotsPerTier, medium.length)
  const hSlots = Math.min(slotsPerTier, hard.length)

  const selected: Question[] = []
  selected.push(...easy.slice(0, eSlots))
  selected.push(...medium.slice(0, mSlots))
  selected.push(...hard.slice(0, hSlots))

  // Fill any remaining slots (happens when a tier had fewer than its allocation)
  // Priority: hard first (maximise points), then medium, then easy
  if (selected.length < 6) {
    const used = new Set(selected.map(q => q.id ?? q.q))
    const extras = [
      ...hard.filter(q   => !used.has(q.id ?? q.q)),
      ...medium.filter(q => !used.has(q.id ?? q.q)),
      ...easy.filter(q   => !used.has(q.id ?? q.q)),
    ]
    selected.push(...extras.slice(0, 6 - selected.length))
  }

  return selected
}

export async function saveQuestion(
  categoryId: string, q: string, a: string,
  difficulty: Difficulty, imageUrl?: string
): Promise<void> {
  const data: Record<string, unknown> = { q, a, difficulty }
  if (imageUrl) data.imageUrl = imageUrl
  await addDoc(collection(getDb(), 'questions', categoryId, 'items'), data)
}

export async function updateQuestion(
  categoryId: string, questionId: string,
  q: string, a: string, difficulty: Difficulty, imageUrl?: string
): Promise<void> {
  const data: Record<string, unknown> = { q, a, difficulty }
  if (imageUrl !== undefined) data.imageUrl = imageUrl
  await updateDoc(doc(getDb(), 'questions', categoryId, 'items', questionId), data)
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
