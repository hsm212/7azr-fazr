'use client'
export const dynamic = 'force-dynamic'
import { useParams } from 'next/navigation'
import { useGame }   from '@/hooks/useGame'
import { useTimer }  from '@/hooks/useTimer'
import { ALL_CATS, POINTS, DIFF } from '@/lib/categories'

const DRAFT_ORDER = ['a','b','b','a','a','b'] as const

export default function PlayerPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { game, loading, error } = useGame(roomId)
  const { timerState }           = useTimer(roomId, false)

  if (loading) return <Center><p style={{ color: '#6b74b8', fontWeight: 700, fontSize: 18 }}>جاري الاتصال بالغرفة…</p></Center>
  if (error)   return <Center><p style={{ color: '#e63946', fontWeight: 700 }}>الغرفة غير موجودة: {roomId}</p></Center>
  if (!game)   return null

  // ── Active question — read from game.questions (same source as host) ──────
  let activeQ: { q: string; pts: number; catName: string; catEmoji: string; diff: string; team: 'a'|'b' } | null = null
  if (game.activeCard && game.phase === 'game' && game.questions) {
    const [colStr, rowStr] = game.activeCard.split('-')
    const col = parseInt(colStr), row = parseInt(rowStr)
    const cid = game.categories[col]
    if (cid) {
      const cat      = ALL_CATS.find(c => c.id === cid)!
      const question = game.questions[cid]?.[row]
      if (question) {
        activeQ = {
          q:        question.q,
          pts:      POINTS[row],
          catName:  cat.name,
          catEmoji: cat.emoji,
          diff:     DIFF[row],
          team:     col < 3 ? 'a' : 'b',
        }
      }
    }
  }

  const isTimerActive = timerState.running || timerState.expired

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080a10', fontFamily: 'Tajawal, sans-serif' }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-2 sticky top-0 z-50"
        style={{ background: 'rgba(8,10,16,.95)', borderBottom: '1px solid #252b55', backdropFilter: 'blur(12px)' }}>
        <div className="text-lg font-black" style={{ background: 'linear-gradient(90deg,#e63946,#ffd60a,#06d6a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          حزر فزر
        </div>
        <div className="flex items-center gap-3">
          <ScoreChip color="#e63946" name={game.teamA.name} score={game.teamA.score} active={game.turn === 'a'} />
          <span style={{ fontSize: 12, color: '#6b74b8' }}>ضد</span>
          <ScoreChip color="#06d6a0" name={game.teamB.name} score={game.teamB.score} active={game.turn === 'b'} />
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: '#181c3a', border: '1px solid #252b55', color: '#9099d0' }}>
          {roomId}
        </span>
      </header>

      {/* ── Draft phase — live category selection view ── */}
      {game.phase === 'draft' && (
        <div className="flex-1 p-5 max-w-3xl mx-auto w-full overflow-auto">

          {/* Current turn banner */}
          {game.categories.length < 6 ? (
            <div className="text-center mb-5 py-3 px-6 rounded-2xl font-bold text-sm"
              style={{
                background: DRAFT_ORDER[game.categories.length] === 'a' ? 'rgba(230,57,70,.15)' : 'rgba(6,214,160,.1)',
                border: `1px solid ${DRAFT_ORDER[game.categories.length] === 'a' ? '#e63946' : '#06d6a0'}`,
                color: DRAFT_ORDER[game.categories.length] === 'a' ? '#e63946' : '#06d6a0',
              }}>
              🎯 فريق {DRAFT_ORDER[game.categories.length] === 'a' ? game.teamA.name : game.teamB.name} يختار الآن…
            </div>
          ) : (
            <div className="text-center mb-5 py-3 px-6 rounded-2xl font-bold text-sm"
              style={{ background: 'rgba(255,214,10,.1)', border: '1px solid #ffd60a', color: '#ffd60a' }}>
              ✓ تم اختيار جميع الفئات — اللعبة على وشك البدء!
            </div>
          )}

          {/* Picks so far */}
          <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {(['a','b'] as const).map(t => (
              <div key={t} className="rounded-xl p-3"
                style={{ background: '#10132a', border: `1px solid ${t === 'a' ? '#e63946' : '#06d6a0'}33` }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: t === 'a' ? '#e63946' : '#06d6a0', marginBottom: 8 }}>
                  اختيارات فريق {t === 'a' ? game.teamA.name : game.teamB.name}
                </div>
                {[0,1,2].map(i => {
                  const pickedCatId = game.categories.filter((_: string, idx: number) => DRAFT_ORDER[idx] === t)[i]
                  const cat = pickedCatId ? ALL_CATS.find(c => c.id === pickedCatId) : null
                  return (
                    <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1"
                      style={{
                        background: cat ? (t === 'a' ? 'rgba(230,57,70,.08)' : 'rgba(6,214,160,.06)') : '#181c3a',
                        border: `1px ${cat ? 'solid' : 'dashed'} ${cat ? (t === 'a' ? '#e63946' : '#06d6a0') : '#252b55'}`,
                      }}>
                      {cat ? (
                        <>
                          <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: t === 'a' ? '#e63946' : '#06d6a0' }}>{cat.name}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: '#6b74b8' }}>اختيار {i+1}…</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* All categories grid — read only, shows picked state */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b74b8', marginBottom: 10 }}>الفئات المتاحة</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))' }}>
            {ALL_CATS.map(cat => {
              const idx    = game.categories.indexOf(cat.id)
              const picked = idx !== -1
              const team   = picked ? DRAFT_ORDER[idx] : null
              return (
                <div key={cat.id} className="rounded-xl p-3 text-right"
                  style={{
                    background: team === 'a' ? 'rgba(230,57,70,.1)' : team === 'b' ? 'rgba(6,214,160,.07)' : '#10132a',
                    border: team === 'a' ? '1px solid #e63946' : team === 'b' ? '1px solid #06d6a0' : '1px solid #252b55',
                    opacity: picked ? 1 : 0.7,
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{cat.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e8eaf6' }}>{cat.name}</div>
                  {team && (
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4,
                      color: team === 'a' ? '#e63946' : '#06d6a0' }}>
                      ✓ {team === 'a' ? game.teamA.name : game.teamB.name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Game phase ── */}
      {game.phase === 'game' && (
        <div className="flex-1 p-3 overflow-auto">

          {/* Active question card */}
          {activeQ && (
            <div className="max-w-xl mx-auto mb-4 rounded-2xl overflow-hidden"
              style={{
                background: '#10132a',
                border: `2px solid ${activeQ.team === 'a' ? '#e63946' : '#06d6a0'}`,
                boxShadow: `0 0 30px ${activeQ.team === 'a' ? 'rgba(230,57,70,.25)' : 'rgba(6,214,160,.2)'}`,
              }}>
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3"
                style={{ background: activeQ.team === 'a' ? 'rgba(230,57,70,.12)' : 'rgba(6,214,160,.08)', borderBottom: '1px solid #252b55' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 20 }}>{activeQ.catEmoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: activeQ.team === 'a' ? '#e63946' : '#06d6a0' }}>
                    {activeQ.catName}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#181c3a', color: '#9099d0' }}>
                    {activeQ.diff}
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#ffd60a' }}>
                  {activeQ.pts} <span style={{ fontSize: 13, fontWeight: 400, color: '#6b74b8' }}>نقطة</span>
                </div>
              </div>

              {/* Question text */}
              <div className="px-5 py-5 text-center">
                <div style={{ fontSize: 20, fontWeight: 700, color: '#e8eaf6', lineHeight: 2 }}>
                  {activeQ.q}
                </div>
              </div>

              {/* Timer */}
              {isTimerActive && (
                <div className="px-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, fontWeight: 700, color: timerState.phase === 1 ? '#ffd60a' : '#9099d0' }}>
                      {timerState.phase === 1
                        ? `دور ${timerState.mainTeam === 'a' ? game.teamA.name : game.teamB.name} — ٦٠ث`
                        : `فرصة ${timerState.mainTeam === 'a' ? game.teamB.name : game.teamA.name} — ٣٠ث`}
                    </span>
                    <span style={{ fontSize: 26, fontWeight: 900, color: timerState.secs <= 10 ? '#e63946' : '#ffd60a' }}>
                      {Math.max(0, timerState.secs)}
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#1f244a', borderRadius: 4 }}>
                    <div className="transition-all duration-1000" style={{
                      width: `${Math.max(0, timerState.secs / timerState.max * 100)}%`,
                      height: '100%', borderRadius: 4,
                      background: timerState.secs <= 10 ? '#e63946' : timerState.phase === 1 ? '#ffd60a' : '#9099d0',
                    }} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: timerState.phase === 1 ? '#ffd60a' : '#303870' }} />
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: timerState.phase === 2 ? '#ffd60a' : '#1f244a' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category headers */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
            {game.categories.map((cid: string, i: number) => {
              const cat = ALL_CATS.find(c => c.id === cid)!
              const t   = i < 3 ? 'a' : 'b'
              return (
                <div key={cid} className="rounded-lg py-1.5 text-center text-[10px] font-bold truncate"
                  style={{
                    background: t === 'a' ? 'rgba(230,57,70,.06)' : 'rgba(6,214,160,.04)',
                    border: '1px solid #252b55',
                    borderTop: `2px solid ${t === 'a' ? '#e63946' : '#06d6a0'}`,
                    color: t === 'a' ? '#e63946' : '#06d6a0',
                  }}>
                  {cat.emoji} {cat.name}
                </div>
              )
            })}
          </div>

          {/* Grid */}
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
            {Array.from({ length: 6 }, (_, row) =>
              game.categories.map((cid: string, col: number) => {
                const key      = `${col}-${row}`
                const result   = game.answered[key]
                const pts      = POINTS[row]
                const isActive = game.activeCard === key
                return (
                  <div key={key}
                    className="aspect-square rounded-xl flex flex-col items-center justify-center relative"
                    style={{
                      background: result === 'a' ? 'rgba(230,57,70,.15)'
                                : result === 'b' ? 'rgba(6,214,160,.1)'
                                : result === 'x' ? 'rgba(60,60,80,.25)'
                                : isActive       ? 'rgba(255,214,10,.12)'
                                : '#181c3a',
                      border: result === 'a' ? '1px solid #e63946'
                            : result === 'b' ? '1px solid #06d6a0'
                            : result === 'x' ? '1px solid #444'
                            : isActive       ? '2px solid #ffd60a'
                            : '1px solid #252b55',
                      opacity: result === 'x' ? 0.4 : 1,
                      transform: isActive && !result ? 'scale(1.05)' : 'scale(1)',
                      transition: 'transform .3s',
                    }}>
                    {!result && (
                      <>
                        <span style={{ fontSize: 16, fontWeight: 900, color: '#ffd60a' }}>{pts}</span>
                        <span style={{ fontSize: 8, color: '#6b74b8' }}>{DIFF[row]}</span>
                        {isActive && <span style={{ fontSize: 8, color: '#ffd60a', fontWeight: 700 }}>●</span>}
                      </>
                    )}
                    {result && result !== 'x' && (
                      <span style={{ fontSize: 11, fontWeight: 900, color: result === 'a' ? '#e63946' : '#06d6a0' }}>
                        {result === 'a' ? game.teamA.name.slice(0,3) : game.teamB.name.slice(0,3)}
                      </span>
                    )}
                    {result === 'x' && <span style={{ color: '#555' }}>—</span>}
                  </div>
                )
              })
            )}
          </div>

          {!activeQ && (
            <div className="text-center mt-4" style={{ color: '#6b74b8', fontSize: 13 }}>
              في انتظار المضيف لاختيار سؤال…
            </div>
          )}
        </div>
      )}

      {/* ── Ended ── */}
      {game.phase === 'ended' && (
        <Center>
          <div className="text-center">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-2xl font-black mb-2" style={{ color: '#ffd60a' }}>انتهت اللعبة!</p>
            <p className="text-xl font-black mb-1"
              style={{ color: game.teamA.score >= game.teamB.score ? '#e63946' : '#06d6a0' }}>
              {game.teamA.score >= game.teamB.score ? game.teamA.name : game.teamB.name} يفوز! 🎉
            </p>
            <p className="text-sm mt-3 px-6 py-3 rounded-xl"
              style={{ background: '#10132a', color: '#9099d0' }}>
              {game.teamA.name}: <strong style={{ color: '#e63946' }}>{game.teamA.score}</strong>
              {'  —  '}
              {game.teamB.name}: <strong style={{ color: '#06d6a0' }}>{game.teamB.score}</strong>
            </p>
          </div>
        </Center>
      )}
    </div>
  )
}

function ScoreChip({ color, name, score, active }: { color: string; name: string; score: number; active: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
      style={{
        background: `${color}22`,
        border: `1px solid ${active ? '#ffd60a' : color}55`,
        color,
        boxShadow: active ? '0 0 10px rgba(255,214,10,.3)' : 'none',
      }}>
      <span>{name}</span>
      <span className="text-base font-black">{score}</span>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh]"
      style={{ fontFamily: 'Tajawal, sans-serif', color: '#e8eaf6' }}>
      {children}
    </div>
  )
}
