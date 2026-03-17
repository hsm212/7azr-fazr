'use client'
export const dynamic = 'force-dynamic'
import { useParams } from 'next/navigation'
import { useGame }   from '@/hooks/useGame'
import { useTimer }  from '@/hooks/useTimer'
import { ALL_CATS, POINTS, STARS, DIFF, LOCAL_QB } from '@/lib/categories'

export default function PlayerPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { game, loading, error } = useGame(roomId)
  const { timerState }           = useTimer(roomId, false)

  if (loading) return <Center><p className="text-[#6b74b8] font-bold text-lg">جاري الاتصال بالغرفة…</p></Center>
  if (error)   return <Center><p className="text-[#e63946] font-bold">الغرفة غير موجودة: {roomId}</p></Center>
  if (!game)   return null

  // ── Derive active question from game state ──────────────────────────────────
  let activeQuestion: { q: string; pts: number; catName: string; catEmoji: string; diff: string; team: 'a'|'b' } | null = null
  if (game.activeCard && game.phase === 'game') {
    const [colStr, rowStr] = game.activeCard.split('-')
    const col = parseInt(colStr)
    const row = parseInt(rowStr)
    const cid = game.categories[col]
    if (cid) {
      const cat      = ALL_CATS.find(c => c.id === cid)!
      const qList    = LOCAL_QB[cid] ?? []
      const question = qList[row]
      if (question) {
        activeQuestion = {
          q:         question.q,
          pts:       POINTS[row],
          catName:   cat.name,
          catEmoji:  cat.emoji,
          diff:      DIFF[row],
          team:      col < 3 ? 'a' : 'b',
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
          سين جيم
        </div>
        <div className="flex items-center gap-3">
          <ScoreChip color="#e63946" name={game.teamA.name} score={game.teamA.score} active={game.turn === 'a'} />
          <span className="text-xs" style={{ color: '#6b74b8' }}>ضد</span>
          <ScoreChip color="#06d6a0" name={game.teamB.name} score={game.teamB.score} active={game.turn === 'b'} />
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: '#181c3a', border: '1px solid #252b55', color: '#9099d0' }}>
          {roomId}
        </span>
      </header>

      {/* ── Draft phase ── */}
      {game.phase === 'draft' && (
        <Center>
          <div className="text-center">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-lg font-bold" style={{ color: '#9099d0' }}>المضيف يختار الفئات…</p>
            <p className="text-sm mt-2" style={{ color: '#6b74b8' }}>ستبدأ اللعبة تلقائياً</p>
          </div>
        </Center>
      )}

      {/* ── Game phase ── */}
      {game.phase === 'game' && (
        <div className="flex-1 p-3 overflow-auto">

          {/* ── Active question card — shown when host opens a card ── */}
          {activeQuestion && (
            <div className="max-w-xl mx-auto mb-4 rounded-2xl overflow-hidden"
              style={{
                background: '#10132a',
                border: `2px solid ${activeQuestion.team === 'a' ? '#e63946' : '#06d6a0'}`,
                boxShadow: `0 0 30px ${activeQuestion.team === 'a' ? 'rgba(230,57,70,.25)' : 'rgba(6,214,160,.2)'}`,
              }}>

              {/* Top bar: category + points */}
              <div className="flex items-center justify-between px-5 py-3"
                style={{ background: activeQuestion.team === 'a' ? 'rgba(230,57,70,.12)' : 'rgba(6,214,160,.08)', borderBottom: '1px solid #252b55' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 20 }}>{activeQuestion.catEmoji}</span>
                  <span className="font-bold text-sm" style={{ color: activeQuestion.team === 'a' ? '#e63946' : '#06d6a0' }}>
                    {activeQuestion.catName}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#181c3a', color: '#9099d0' }}>
                    {activeQuestion.diff}
                  </span>
                </div>
                <div className="text-2xl font-black" style={{ color: '#ffd60a' }}>
                  {activeQuestion.pts} <span className="text-sm font-normal" style={{ color: '#6b74b8' }}>نقطة</span>
                </div>
              </div>

              {/* Question text */}
              <div className="px-5 py-5">
                <div className="text-xl leading-relaxed font-bold text-center"
                  style={{ color: '#e8eaf6', lineHeight: '2' }}>
                  {activeQuestion.q}
                </div>
              </div>

              {/* Timer bar at bottom of question card */}
              {isTimerActive && (
                <div className="px-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold"
                      style={{ color: timerState.phase === 1 ? '#ffd60a' : '#9099d0' }}>
                      {timerState.phase === 1
                        ? `دور ${timerState.mainTeam === 'a' ? game.teamA.name : game.teamB.name} — ٦٠ث`
                        : `فرصة ${timerState.mainTeam === 'a' ? game.teamB.name : game.teamA.name} — ٣٠ث`}
                    </span>
                    <span className="text-2xl font-black"
                      style={{ color: timerState.secs <= 10 ? '#e63946' : '#ffd60a' }}>
                      {Math.max(0, timerState.secs)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: '#1f244a' }}>
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.max(0, timerState.secs / timerState.max * 100)}%`,
                        background: timerState.secs <= 10 ? '#e63946'
                                  : timerState.phase === 1 ? '#ffd60a' : '#9099d0',
                      }} />
                  </div>
                  {/* Phase dots */}
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 h-1 rounded-full"
                      style={{ background: timerState.phase === 1 ? '#ffd60a' : '#303870' }} />
                    <div className="flex-1 h-1 rounded-full"
                      style={{ background: timerState.phase === 2 ? '#ffd60a' : '#1f244a' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Category headers ── */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
            {game.categories.map((cid, i) => {
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

          {/* ── Grid ── */}
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
            {Array.from({ length: 6 }, (_, row) =>
              game.categories.map((cid, col) => {
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
                      transition: 'transform .3s, border .3s',
                    }}>
                    {!result && (
                      <>
                        <span className="text-base font-black" style={{ color: '#ffd60a', opacity: isActive ? 1 : 0.85 }}>{pts}</span>
                        <span className="text-[8px]" style={{ color: '#6b74b8' }}>{DIFF[row]}</span>
                        {isActive && <span className="text-[8px] font-bold mt-0.5" style={{ color: '#ffd60a' }}>●</span>}
                      </>
                    )}
                    {result && result !== 'x' && (
                      <span className="text-xs font-black" style={{ color: result === 'a' ? '#e63946' : '#06d6a0' }}>
                        {result === 'a' ? game.teamA.name.slice(0,3) : game.teamB.name.slice(0,3)}
                      </span>
                    )}
                    {result === 'x' && <span style={{ color: '#555' }}>—</span>}
                  </div>
                )
              })
            )}
          </div>

          {/* ── No active question placeholder ── */}
          {!activeQuestion && !isTimerActive && (
            <div className="text-center mt-6" style={{ color: '#6b74b8' }}>
              <p className="text-sm">في انتظار المضيف لاختيار سؤال…</p>
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

function ScoreChip({ color, name, score, active }: {
  color: string; name: string; score: number; active: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
      style={{
        background: `${color}22`,
        border:     `1px solid ${active ? '#ffd60a' : color}55`,
        color,
        boxShadow:  active ? '0 0 10px rgba(255,214,10,.3)' : 'none',
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
