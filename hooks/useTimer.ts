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
    phase: 1, secs: PHASE1_SECS, max: PHASE1_SECS,
    running: false, mainTeam: 'a', expired: false,
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const stateRef    = useRef(state)
  stateRef.current  = state

  // All devices subscribe to timer state
  useEffect(() => {
    if (!roomId) return
    const timerRef = ref(getRtdb(), `timers/${roomId}`)
    const unsub = onValue(timerRef, snap => {
      if (snap.exists()) setState(snap.val() as TimerState)
    })
    return unsub
  }, [roomId])

  const writeState = useCallback((s: TimerState) => {
    set(ref(getRtdb(), `timers/${roomId}`), s)
    setState(s)
  }, [roomId])

  const clearTick = () => { if (intervalRef.current) clearInterval(intervalRef.current) }

  // Host-only: tick
  const startTick = useCallback((initial: TimerState) => {
    clearTick()
    let current = initial
    intervalRef.current = setInterval(() => {
      const next = { ...current, secs: current.secs - 1 }
      if (next.secs < 0) {
        // Phase 1 expired — DO NOT auto-transition; host handles it manually
        // Phase 2 expired — mark expired
        const expired: TimerState = { ...current, secs: 0, running: false, expired: true }
        writeState(expired)
        clearTick()
        return
      }
      writeState(next)
      current = next
    }, 1000)
  }, [writeState])

  // Start phase 1 (60s for active team)
  const startTimer = useCallback((mainTeam: 'a' | 'b') => {
    if (!isHost) return
    clearTick()
    const initial: TimerState = {
      phase: 1, secs: PHASE1_SECS, max: PHASE1_SECS,
      running: true, mainTeam, expired: false,
    }
    writeState(initial)
    startTick(initial)
  }, [isHost, writeState, startTick])

  // Manually jump to phase 2 (30s for opponent) — triggered by host clicking "answered"
  const startPhase2 = useCallback((mainTeam: 'a' | 'b') => {
    if (!isHost) return
    clearTick()
    const p2: TimerState = {
      phase: 2, secs: PHASE2_SECS, max: PHASE2_SECS,
      running: true, mainTeam, expired: false,
    }
    writeState(p2)
    startTick(p2)
  }, [isHost, writeState, startTick])

  const stopTimer = useCallback(() => {
    if (!isHost) return
    clearTick()
    const stopped = { ...stateRef.current, running: false }
    writeState(stopped)
  }, [isHost, writeState])

  useEffect(() => () => clearTick(), [])

  return { timerState: state, startTimer, startPhase2, stopTimer }
}
