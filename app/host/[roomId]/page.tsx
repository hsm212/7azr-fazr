'use client'
import { useParams }    from 'next/navigation'
import { useEffect, useState } from 'react'
import { useGame }      from '@/hooks/useGame'
import { useTimer }     from '@/hooks/useTimer'
import { ALL_CATS, POINTS, STARS, DIFF } from '@/lib/categories'
import { fetchQuestions } from '@/hooks/useGame'
import type { Question } from '@/types/game'

const DRAFT_ORDER = ['a','b','b','a','a','b'] as const

export default function HostPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { game, loading, error, setCategories, openCard, awardPoints, cancelCard, useLifeline } = useGame(roomId)
  const { timerState, startTimer, stopTimer } = useTimer(roomId, true)

  const [draftStep, setDraftStep] = useState(0)
  const [gameQuestions, setGameQuestions] = useState<Record<string, Question[]>>({})
  const [activeQ, setActiveQ] = useState<{ key: string; cid: string; row: number; pts: number } | null>(null)
  const [answerVisible, setAnswerVisible] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Load questions when game starts
  useEffect(() => {
    if (!game || game.phase !== 'game' || game.categories.length !== 6) return
    const load = async () => {
      const qmap: Record<string, Question[]> = {}
      for (const cid of game.categories) {
        qmap[cid] = await fetchQuestions(cid)
      }
      setGameQuestions(qmap)
    }
    load()
  }, [game?.phase, game?.categories?.join()])

  // Auto-cancel when timer expires
  useEffect(() => {
    if (timerState.expired && activeQ) {
      cancelCard(activeQ.key)
      setActiveQ(null)
      setAnswerVisible(false)
      toast('⏰ لم يجب أحد — تم إلغاء السؤال')
    }
  }, [timerState.expired])

  const toast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  // ── Draft pick ─────────────────────────────────────────────────────────────
  const pickCat = async (catId: string) => {
    if (!game || draftStep >= 6) return
    const picks = game.categories
    if (picks.includes(catId)) return
    const newPicks = [...picks, catId]
    await setCategories(newPicks)
    setDraftStep(s => s + 1)
  }

  // ── Open a question card ───────────────────────────────────────────────────
  const handleCardClick = async (key: string, cid: string, row: number, pts: number) => {
    if (game?.answered[key]) return
    await openCard(key)
    setActiveQ({ key, cid, row, pts })
    setAnswerVisible(false)
    startTimer(game!.turn)
  }

  // ── Award ──────────────────────────────────────────────────────────────────
  const handleAward = async (team: 'a' | 'b') => {
    if (!activeQ) return
    stopTimer()
    await awardPoints(team, activeQ.key, activeQ.pts)
    toast(`+${activeQ.pts} نقطة → فريق ${team === 'a' ? game?.teamA.name : game?.teamB.name}`)
    setActiveQ(null)
    setAnswerVisible(false)
  }

  const handleCancel = async () => {
    if (!activeQ) return
    stopTimer()
    await cancelCard(activeQ.key)
    setActiveQ(null)
    setAnswerVisible(false)
    toast('تم تخطي السؤال')
  }

  if (loading) return <LoadingScreen />
  if (error)   return <ErrorScreen msg={error} />
  if (!game)   return null

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/game/${roomId}`
    : ''

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080a10', fontFamily: 'Tajawal, sans-serif' }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3 sticky top-0 z-50"
        style={{ background: 'rgba(8,10,16,.95)', borderBottom: '1px solid #252b55', backdropFilter: 'blur(12px)' }}>
        <div className="text-xl font-black" style={{ background: 'linear-gradient(90deg,#e63946,#ffd60a,#06d6a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          سين جيم — المضيف
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: '#181c3a', border: '1px solid #252b55', color: '#9099d0' }}>
            كود الغرفة: <span className="text-[#ffd60a]">{roomId}</span>
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="text-xs px-3 py-1 rounded-full font-bold transition-all hover:opacity-80"
            style={{ background: '#181c3a', border: '1px solid #ffd60a', color: '#ffd60a' }}
          >
            نسخ رابط اللاعبين
          </button>
        </div>
      </header>

      {/* ── DRAFT PHASE ── */}
      {game.phase === 'draft' && (
        <DraftPanel
          game={game}
          draftStep={draftStep}
          draftOrder={DRAFT_ORDER}
          onPick={pickCat}
        />
      )}

      {/* ── GAME PHASE ── */}
      {game.phase === 'game' && (
        <div className="flex flex-1 overflow-hidden">

          {/* Team A sidebar */}
          <SidePanel team="a" name={game.teamA.name} score={game.teamA.score}
            isTurn={game.turn === 'a'} usedLL={game.usedLifelines.a}
            onLL={(type) => { useLifeline('a', type); toast(`✌️ ${type} — فريق ${game.teamA.name}`) }} />

          {/* Board */}
          <div className="flex-1 p-3 overflow-auto flex flex-col gap-2">

            {/* Category headers */}
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
              {game.categories.map((cid, i) => {
                const cat = ALL_CATS.find(c => c.id === cid)!
                const t   = i < 3 ? 'a' : 'b'
                return (
                  <div key={cid} className="rounded-lg py-2 text-center text-xs font-bold truncate"
                    style={{
                      background: t === 'a' ? 'rgba(230,57,70,.06)' : 'rgba(6,214,160,.04)',
                      border:     `1px solid #252b55`,
                      borderTop:  `2px solid ${t === 'a' ? '#e63946' : '#06d6a0'}`,
                      color:      t === 'a' ? '#e63946' : '#06d6a0',
                    }}>
                    {cat.emoji} {cat.name}
                  </div>
                )
              })}
            </div>

            {/* Question grid */}
            <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
              {Array.from({ length: 6 }, (_, row) =>
                game.categories.map((cid, col) => {
                  const key    = `${col}-${row}`
                  const result = game.answered[key]
                  const pts    = POINTS[row]
                  const isOpen = activeQ?.key === key

                  return (
                    <button
                      key={key}
                      onClick={() => !result && handleCardClick(key, cid, row, pts)}
                      className="aspect-square rounded-xl flex flex-col items-center justify-center
                                 transition-all relative"
                      style={{
                        background: result === 'a' ? 'rgba(230,57,70,.15)'
                                  : result === 'b' ? 'rgba(6,214,160,.1)'
                                  : result === 'x' ? 'rgba(60,60,80,.25)'
                                  : isOpen         ? 'rgba(255,214,10,.12)'
                                  : '#181c3a',
                        border: result === 'a' ? '1px solid #e63946'
                              : result === 'b' ? '1px solid #06d6a0'
                              : result === 'x' ? '1px solid #444'
                              : isOpen         ? '1px solid #ffd60a'
                              : '1px solid #252b55',
                        cursor: result ? 'default' : 'pointer',
                        opacity: result === 'x' ? 0.4 : 1,
                      }}
                    >
                      {!result && (
                        <>
                          <span className="text-lg font-black" style={{ color: '#ffd60a' }}>{pts}</span>
                          <span className="text-[8px]" style={{ color: '#6b74b8' }}>{DIFF[row]}</span>
                          <span className="text-[9px]" style={{ color: '#ffd60a', opacity: 0.7 }}>{STARS[row]}</span>
                        </>
                      )}
                      {result && result !== 'x' && (
                        <span className="text-sm font-black" style={{ color: result === 'a' ? '#e63946' : '#06d6a0' }}>
                          {result === 'a' ? game.teamA.name.slice(0,3) : game.teamB.name.slice(0,3)}
                        </span>
                      )}
                      {result === 'x' && <span className="text-lg" style={{ color: '#555' }}>—</span>}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Team B sidebar */}
          <SidePanel team="b" name={game.teamB.name} score={game.teamB.score}
            isTurn={game.turn === 'b'} usedLL={game.usedLifelines.b}
            onLL={(type) => { useLifeline('b', type); toast(`🕳️ ${type} — فريق ${game.teamB.name}`) }} />
        </div>
      )}

      {/* ── QUESTION MODAL ── */}
      {activeQ && game.phase === 'game' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-2xl p-7 w-full max-w-lg relative"
            style={{ background: '#10132a', border: '1px solid #252b55' }}>

            {/* Timer */}
            <TimerDisplay timer={timerState} teamA={game.teamA.name} teamB={game.teamB.name} />

            {/* Points */}
            <div className="text-5xl font-black mb-2" style={{ color: '#ffd60a' }}>
              {activeQ.pts} <span className="text-base" style={{ color: '#6b74b8' }}>نقطة</span>
            </div>

            {/* Question */}
            <div className="text-lg leading-loose mb-5 pr-3"
              style={{ borderRight: '3px solid #ffd60a', color: '#e8eaf6' }}>
              {gameQuestions[activeQ.cid]?.[activeQ.row]?.q ?? 'جاري التحميل…'}
            </div>

            {/* Answer reveal */}
            {answerVisible && (
              <div className="rounded-xl px-4 py-3 mb-4 font-bold text-sm"
                style={{ background: 'rgba(255,214,10,.07)', border: '1px solid rgba(255,214,10,.25)', color: '#ffd60a' }}>
                ✓ {gameQuestions[activeQ.cid]?.[activeQ.row]?.a}
              </div>
            )}
            {!answerVisible && (
              <button onClick={() => setAnswerVisible(true)}
                className="w-full py-2 rounded-xl mb-3 font-bold text-sm transition-all hover:brightness-110"
                style={{ background: 'rgba(255,214,10,.08)', border: '1px solid rgba(255,214,10,.28)', color: '#ffd60a' }}>
                🔍 اكشف الإجابة
              </button>
            )}

            {/* Award buttons */}
            <div className="flex gap-2">
              <button onClick={() => handleAward('a')}
                className="flex-1 py-3 rounded-xl font-black text-sm transition-all hover:brightness-110"
                style={{ background: 'rgba(230,57,70,.12)', border: '1px solid #e63946', color: '#e63946' }}>
                ✔ {game.teamA.name} أجاب صح
              </button>
              <button onClick={() => handleAward('b')}
                className="flex-1 py-3 rounded-xl font-black text-sm transition-all hover:brightness-110"
                style={{ background: 'rgba(6,214,160,.08)', border: '1px solid #06d6a0', color: '#06d6a0' }}>
                ✔ {game.teamB.name} أجاب صح
              </button>
              <button onClick={handleCancel}
                className="px-4 py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'transparent', border: '1px solid #252b55', color: '#6b74b8' }}>
                تخطي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-xl font-bold text-sm z-50"
          style={{ background: '#181c3a', border: '1px solid #252b55', color: '#e8eaf6' }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidePanel({ team, name, score, isTurn, usedLL, onLL }: {
  team: 'a'|'b'; name: string; score: number
  isTurn: boolean; usedLL: string[]
  onLL: (type: string) => void
}) {
  const color = team === 'a' ? '#e63946' : '#06d6a0'
  const lifelines = [
    { id: 'double', label: 'تخمين مزدوج', icon: '✌️' },
    { id: 'friend', label: 'اتصل بصديق',  icon: '📞' },
    { id: 'pit',    label: 'الحفرة',        icon: '🕳️' },
    { id: 'rest',   label: 'استريح',        icon: '💺' },
  ]
  return (
    <div className="flex flex-col gap-4 p-3" style={{ width: 158, minWidth: 158, background: '#10132a', borderLeft: team === 'b' ? '1px solid #252b55' : 'none', borderRight: team === 'a' ? '1px solid #252b55' : 'none' }}>
      <div>
        <div className="text-xs font-black mb-1" style={{ color }}>{name}</div>
        <div className="text-4xl font-black leading-none" style={{ color }}>{score}</div>
        {isTurn && <div className="flex items-center gap-1 text-xs font-bold mt-1" style={{ color: '#ffd60a' }}>
          <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#ffd60a' }} /> دورك
        </div>}
      </div>
      <div>
        <div className="text-[10px] font-bold mb-2" style={{ color: '#6b74b8' }}>المساعدات</div>
        {lifelines.map(ll => (
          <button key={ll.id} onClick={() => onLL(ll.id)}
            disabled={usedLL.includes(ll.id)}
            className="flex items-center gap-2 w-full text-right px-2 py-2 rounded-lg mb-1 text-xs font-bold transition-all disabled:opacity-25 disabled:cursor-not-allowed disabled:line-through"
            style={{ background: '#181c3a', border: '1px solid #252b55', color: '#e8eaf6', fontFamily: 'Tajawal, sans-serif' }}>
            <span style={{ fontSize: 13 }}>{ll.icon}</span>{ll.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TimerDisplay({ timer, teamA, teamB }: {
  timer: { phase: number; secs: number; max: number; mainTeam: string; expired: boolean }
  teamA: string; teamB: string
}) {
  const pct     = Math.max(0, (timer.secs / timer.max) * 100)
  const urgent  = timer.secs <= 10
  const isPhase1 = timer.phase === 1
  const label   = isPhase1
    ? `دور ${timer.mainTeam === 'a' ? teamA : teamB} — ٦٠ث`
    : `فرصة ${timer.mainTeam === 'a' ? teamB : teamA} — ٣٠ث`

  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: '#181c3a', border: '1px solid #252b55' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: isPhase1 ? '#ffd60a' : '#9099d0' }}>{label}</span>
        <span className={`text-3xl font-black ${urgent ? 'timer-urgent' : ''}`}
          style={{ color: urgent ? '#e63946' : '#ffd60a' }}>
          {Math.max(0, timer.secs)}
        </span>
      </div>
      <div className="h-1.5 rounded-full mb-1" style={{ background: '#1f244a' }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: urgent ? '#e63946' : isPhase1 ? '#ffd60a' : '#6b74b8' }} />
      </div>
      <div className="flex gap-1.5 mt-1">
        <div className="flex-1 h-0.5 rounded-full" style={{ background: isPhase1 ? '#ffd60a' : '#303870' }} />
        <div className="flex-1 h-0.5 rounded-full" style={{ background: !isPhase1 ? '#ffd60a' : '#1f244a' }} />
      </div>
    </div>
  )
}

function DraftPanel({ game, draftStep, draftOrder, onPick }: any) {
  const currentTeam = draftOrder[draftStep] as 'a' | 'b'
  const picksA = game.categories.filter((_: string, i: number) => draftOrder.slice(0, draftStep).filter((t: string, j: number) => t === 'a' && draftOrder[j] === 'a').length > 0 ? game.categories.slice(0, draftStep) : [])

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
      {/* Turn banner */}
      {draftStep < 6 && (
        <div className="text-center mb-6 py-3 px-6 rounded-2xl font-bold inline-block"
          style={{
            background: currentTeam === 'a' ? 'rgba(230,57,70,.15)' : 'rgba(6,214,160,.1)',
            border:     `1px solid ${currentTeam === 'a' ? '#e63946' : '#06d6a0'}`,
            color:      currentTeam === 'a' ? '#e63946' : '#06d6a0',
          }}>
          فريق {currentTeam === 'a' ? game.teamA.name : game.teamB.name} — اختر فئتك {['الأولى','الثانية','الثالثة'][game.categories.filter((_:string, i:number) => draftOrder[i] === currentTeam).length] ?? ''}
        </div>
      )}
      {draftStep >= 6 && (
        <div className="text-center mb-6 py-3 px-6 rounded-2xl font-bold"
          style={{ background: 'rgba(255,214,10,.1)', border: '1px solid #ffd60a', color: '#ffd60a' }}>
          ✓ تم اختيار جميع الفئات — اللعبة جاهزة!
        </div>
      )}

      {/* Category grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))' }}>
        {ALL_CATS.map(cat => {
          const idx     = game.categories.indexOf(cat.id)
          const picked  = idx !== -1
          const team    = picked ? draftOrder[idx] : null
          const disabled = picked || draftStep >= 6
          return (
            <button key={cat.id} onClick={() => !disabled && onPick(cat.id)}
              disabled={disabled}
              className="rounded-xl p-4 text-right transition-all"
              style={{
                background: team === 'a' ? 'rgba(230,57,70,.1)'
                          : team === 'b' ? 'rgba(6,214,160,.07)'
                          : '#10132a',
                border:    team === 'a' ? '1px solid #e63946'
                         : team === 'b' ? '1px solid #06d6a0'
                         : '1px solid #252b55',
                opacity:   disabled && !picked ? 0.5 : 1,
                cursor:    disabled ? 'default' : 'pointer',
                fontFamily: 'Tajawal, sans-serif',
              }}>
              <div className="text-2xl mb-2">{cat.emoji}</div>
              <div className="text-sm font-bold" style={{ color: '#e8eaf6' }}>{cat.name}</div>
              <div className="text-xs mt-1" style={{ color: '#6b74b8' }}>{cat.desc}</div>
              {picked && (
                <div className="text-xs font-bold mt-2"
                  style={{ color: team === 'a' ? '#e63946' : '#06d6a0' }}>
                  ✓ {team === 'a' ? game.teamA.name : game.teamB.name}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080a10' }}>
      <p className="text-[#6b74b8] font-bold text-lg" style={{ fontFamily: 'Tajawal, sans-serif' }}>جاري التحميل…</p>
    </div>
  )
}

function ErrorScreen({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080a10' }}>
      <p className="text-[#e63946] font-bold" style={{ fontFamily: 'Tajawal, sans-serif' }}>خطأ: {msg}</p>
    </div>
  )
}
