'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { ref, set, onValue, remove } from 'firebase/database'
import { rtdb } from '@/lib/firebase'

type TimerPhase = 1 | 2   // 1 = main team 60s, 2 = opponent 30s

export type TimerState = {
  phase:    TimerPhase
  secs:     number
  max:      number
  running:  boolean
  mainTeam: 'a' | 'b'
  expired:  boolean         // true when both phases done
}

const PHASE1_SECS = 60
const PHASE2_SECS = 30

/**
 * Host calls startTimer / stopTimer.
 * All clients (players, spectators) call useTimer to read the live state.
 *
 * Timer state is stored in Realtime DB at /timers/{roomId}
 * so every connected device sees the same countdown.
 */
export function useTimer(roomId: string, isHost: boolean) {
  const [state, setState] = useState<TimerState>({
    phase:    1,
    secs:     PHASE1_SECS,
    max:      PHASE1_SECS,
    running:  false,
    mainTeam: 'a',
    expired:  false,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef    = ref(rtdb, `timers/${roomId}`)

  // Subscribe to timer state from Realtime DB
  useEffect(() => {
    if (!roomId) return
    const unsub = onValue(timerRef, (snap) => {
      if (snap.exists()) setState(snap.val() as TimerState)
    })
    return unsub
  }, [roomId])

  // Host-only: tick every second and write to RTDB
  const tick = useCallback(
    (current: TimerState) => {
      if (!isHost) return

      const next = { ...current, secs: current.secs - 1 }

      if (next.secs < 0) {
        if (next.phase === 1) {
          // Switch to opponent phase
          const phase2: TimerState = {
            ...next,
            phase:   2,
            secs:    PHASE2_SECS,
            max:     PHASE2_SECS,
            expired: false,
          }
          set(timerRef, phase2)
          setState(phase2)
          return phase2
        } else {
          // Both phases done
          const expired: TimerState = { ...next, secs: 0, running: false, expired: true }
          set(timerRef, expired)
          setState(expired)
          if (intervalRef.current) clearInterval(intervalRef.current)
          return expired
        }
      }

      set(timerRef, next)
      setState(next)
      return next
    },
    [isHost, timerRef],
  )

  // Start the timer (host only)
  const startTimer = useCallback(
    (mainTeam: 'a' | 'b') => {
      if (!isHost) return
      if (intervalRef.current) clearInterval(intervalRef.current)

      const initial: TimerState = {
        phase:    1,
        secs:     PHASE1_SECS,
        max:      PHASE1_SECS,
        running:  true,
        mainTeam,
        expired:  false,
      }
      set(timerRef, initial)
      setState(initial)

      let current = initial
      intervalRef.current = setInterval(() => {
        current = tick(current) ?? current
        if (!current.running || current.expired) {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      }, 1000)
    },
    [isHost, tick, timerRef],
  )

  // Stop the timer (host only, e.g. when a team answers)
  const stopTimer = useCallback(() => {
    if (!isHost) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setState(prev => {
      const stopped = { ...prev, running: false }
      set(timerRef, stopped)
      return stopped
    })
  }, [isHost, timerRef])

  // Clean up interval on unmount
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  return { timerState: state, startTimer, stopTimer }
}
