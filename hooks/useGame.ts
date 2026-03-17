'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  doc, onSnapshot, setDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { GameState, Question } from '@/types/game'

// ─────────────────────────────────────────────────────────────────────────────
// Room management
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a random 6-char uppercase room code */
export function genRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

/** Create a new game room in Firestore */
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
  await setDoc(doc(db, 'games', roomId), { roomId, ...initial })
}

// ─────────────────────────────────────────────────────────────────────────────
// Main hook — subscribe to a game room and expose action helpers
// ─────────────────────────────────────────────────────────────────────────────

export function useGame(roomId: string) {
  const [game, setGame]       = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Subscribe to live updates
  useEffect(() => {
    if (!roomId) return
    setLoading(true)
    const unsub = onSnapshot(
      doc(db, 'games', roomId),
      (snap) => {
        if (snap.exists()) {
          setGame(snap.data() as GameState)
          setError(null)
        } else {
          setError('الغرفة غير موجودة')
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
    return unsub
  }, [roomId])

  // ── Low-level patch ────────────────────────────────────────────────────────
  const patch = useCallback(
    (data: Record<string, unknown>) => updateDoc(doc(db, 'games', roomId), data),
    [roomId],
  )

  // ── Draft: save selected categories ───────────────────────────────────────
  const setCategories = useCallback(
    (categories: string[]) =>
      patch({ categories, phase: categories.length === 6 ? 'game' : 'draft' }),
    [patch],
  )

  // ── Open a card (host flips it) ────────────────────────────────────────────
  const openCard = useCallback(
    (cardKey: string) => patch({ activeCard: cardKey }),
    [patch],
  )

  // ── Award points to a team ─────────────────────────────────────────────────
  const awardPoints = useCallback(
    async (team: 'a' | 'b', cardKey: string, pts: number) => {
      if (!game) return
      const scoreField = team === 'a' ? 'teamA.score' : 'teamB.score'
      const prevScore  = team === 'a' ? game.teamA.score : game.teamB.score

      // Pit lifeline: deduct from opponent instead
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

  // ── Cancel a card (timer expired, no one answered) ─────────────────────────
  const cancelCard = useCallback(
    (cardKey: string) =>
      patch({
        [`answered.${cardKey}`]: 'x',
        activeCard:              null,
        turn:                    game?.turn === 'a' ? 'b' : 'a',
      }),
    [game, patch],
  )

  // ── Use a lifeline ─────────────────────────────────────────────────────────
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

  // ── End the game ───────────────────────────────────────────────────────────
  const endGame = useCallback(
    () => patch({ phase: 'ended', activeCard: null }),
    [patch],
  )

  return {
    game,
    loading,
    error,
    // actions
    setCategories,
    openCard,
    awardPoints,
    cancelCard,
    useLifeline,
    endGame,
    patch,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Question bank helpers (used by editor + game board)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all questions for a category, shuffled */
export async function fetchQuestions(categoryId: string): Promise<Question[]> {
  const snap = await getDocs(
    collection(db, 'questions', categoryId, 'items'),
  )
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]]
  }
  return all.slice(0, 6)
}

/** Save a new question to Firestore */
export async function saveQuestion(
  categoryId: string,
  q: string,
  a: string,
): Promise<void> {
  await addDoc(collection(db, 'questions', categoryId, 'items'), { q, a })
}

/** Delete a question by ID */
export async function deleteQuestion(
  categoryId: string,
  questionId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'questions', categoryId, 'items', questionId))
}

/** Fetch all questions for a category (no shuffle, for editor view) */
export async function fetchAllQuestions(categoryId: string): Promise<Question[]> {
  const snap = await getDocs(collection(db, 'questions', categoryId, 'items'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
}
