'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { ref, set, onValue } from 'firebase/database'
import { getRtdb } from '@/lib/firebase'

type TimerPhase = 1 | 2

export type TimerState = {
  phase:    TimerPhase
  secs:     number
  max:      number
  running:  boolean
  mainTeam: 'a' | 'b'
  expired:  boolean
}

const PHASE1_SECS = 60
const PHASE2_SECS = 30

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

  // Subscribe to timer state from Realtime DB
  useEffect(() => {
    if (!roomId) return
    const timerRef = ref(getRtdb(), `timers/${roomId}`)
    const unsub = onValue(timerRef, (snap) => {
      if (snap.exists()) setState(snap.val() as TimerState)
    })
    return unsub
  }, [roomId])

  // Host-only: tick every second and write to RTDB
  const tick = useCallback(
    (current: TimerState) => {
      if (!isHost) return current
      const timerRef = ref(getRtdb(), `timers/${roomId}`)
      const next = { ...current, secs: current.secs - 1 }

      if (next.secs < 0) {
        if (next.phase === 1) {
          const phase2: TimerState = {
            ...next, phase: 2, secs: PHASE2_SECS, max: PHASE2_SECS, expired: false,
          }
          set(timerRef, phase2)
          setState(phase2)
          return phase2
        } else {
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
    [isHost, roomId],
  )

  const startTimer = useCallback(
    (mainTeam: 'a' | 'b') => {
      if (!isHost) return
      if (intervalRef.current) clearInterval(intervalRef.current)
      const timerRef = ref(getRtdb(), `timers/${roomId}`)

      const initial: TimerState = {
        phase: 1, secs: PHASE1_SECS, max: PHASE1_SECS,
        running: true, mainTeam, expired: false,
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
    [isHost, tick, roomId],
  )

  const stopTimer = useCallback(() => {
    if (!isHost) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setState(prev => {
      const stopped = { ...prev, running: false }
      const timerRef = ref(getRtdb(), `timers/${roomId}`)
      set(timerRef, stopped)
      return stopped
    })
  }, [isHost, roomId])

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  return { timerState: state, startTimer, stopTimer }
}
