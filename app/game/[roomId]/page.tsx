'use client'
export const dynamic = 'force-dynamic'
import { useParams } from 'next/navigation'
import { useGame }   from '@/hooks/useGame'
import { useTimer }  from '@/hooks/useTimer'
import { ALL_CATS, POINTS, STARS, DIFF } from '@/lib/categories'

export default function PlayerPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { game, loading, error } = useGame(roomId)
  const { timerState }           = useTimer(roomId, false)   // read-only

  if (loading) return <Center><p className="text-[#6b74b8] font-bold text-lg">جاري الاتصال بالغرفة…</p></Center>
  if (error)   return <Center><p className="text-[#e63946] font-bold">الغرفة غير موجودة: {roomId}</p></Center>
  if (!game)   return null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080a10', fontFamily: 'Tajawal, sans-serif' }}>

      {/* Header */}
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

      {/* Waiting for draft */}
      {game.phase === 'draft' && (
        <Center>
          <div className="text-center">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-lg font-bold" style={{ color: '#9099d0' }}>المضيف يختار الفئات…</p>
            <p className="text-sm mt-2" style={{ color: '#6b74b8' }}>ستبدأ اللعبة تلقائياً</p>
          </div>
        </Center>
      )}

      {/* Game board — read only */}
      {game.phase === 'game' && (
        <div className="flex-1 p-3 overflow-auto">

          {/* Live timer */}
          {(timerState.running || timerState.expired) && (
            <div className="max-w-lg mx-auto mb-3 rounded-xl p-3"
              style={{ background: '#10132a', border: '1px solid #252b55' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: timerState.phase === 1 ? '#ffd60a' : '#9099d0' }}>
                  {timerState.phase === 1
                    ? `دور ${timerState.mainTeam === 'a' ? game.teamA.name : game.teamB.name}`
                    : `فرصة ${timerState.mainTeam === 'a' ? game.teamB.name : game.teamA.name}`}
                </span>
                <span className="text-3xl font-black"
                  style={{ color: timerState.secs <= 10 ? '#e63946' : '#ffd60a' }}>
                  {Math.max(0, timerState.secs)}
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: '#1f244a' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(0, timerState.secs / timerState.max * 100)}%`, background: timerState.secs <= 10 ? '#e63946' : '#ffd60a' }} />
              </div>
            </div>
          )}

          {/* Category headers */}
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

          {/* Grid */}
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
            {Array.from({ length: 6 }, (_, row) =>
              game.categories.map((cid, col) => {
                const key    = `${col}-${row}`
                const result = game.answered[key]
                const pts    = POINTS[row]
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
                    }}>
                    {!result && (
                      <>
                        <span className="text-base font-black" style={{ color: isActive ? '#ffd60a' : '#ffd60a', opacity: isActive ? 1 : 0.9 }}>{pts}</span>
                        <span className="text-[8px]" style={{ color: '#6b74b8' }}>{DIFF[row]}</span>
                      </>
                    )}
                    {result && result !== 'x' && (
                      <span className="text-xs font-black" style={{ color: result === 'a' ? '#e63946' : '#06d6a0' }}>
                        {result === 'a' ? game.teamA.name.slice(0,3) : game.teamB.name.slice(0,3)}
                      </span>
                    )}
                    {result === 'x' && <span style={{ color: '#555' }}>—</span>}
                    {isActive && !result && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full pulse-dot"
                        style={{ background: '#ffd60a' }} />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Ended */}
      {game.phase === 'ended' && (
        <Center>
          <div className="text-center">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-2xl font-black mb-2" style={{ color: '#ffd60a' }}>
              انتهت اللعبة!
            </p>
            <p className="text-lg" style={{ color: game.teamA.score >= game.teamB.score ? '#e63946' : '#06d6a0' }}>
              {game.teamA.score >= game.teamB.score ? game.teamA.name : game.teamB.name} يفوز!
            </p>
            <p className="text-sm mt-2" style={{ color: '#9099d0' }}>
              {game.teamA.name}: {game.teamA.score} — {game.teamB.name}: {game.teamB.score}
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
        border:     `1px solid ${active ? '#ffd60a' : color}55`,
        color,
        boxShadow:  active ? `0 0 10px rgba(255,214,10,.3)` : 'none',
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
