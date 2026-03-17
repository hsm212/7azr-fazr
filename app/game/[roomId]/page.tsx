'use client'
export const dynamic = 'force-dynamic'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useTimer } from '@/hooks/useTimer'
import { BUILT_IN_CATS, DIFFICULTY_POINTS, DIFFICULTY_LABEL, DIFFICULTY_COLOR } from '@/lib/categories'
import { fetchAllCategories } from '@/hooks/useGame'
import type { Category } from '@/types/game'

const DRAFT_ORDER = ['a','b','b','a','a','b'] as const

export default function PlayerPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { game, loading, error } = useGame(roomId)
  const { timerState }           = useTimer(roomId, false)
  const [allCats, setAllCats]    = useState<Category[]>(BUILT_IN_CATS)

  useEffect(() => {
    fetchAllCategories().then(setAllCats).catch(() => setAllCats(BUILT_IN_CATS))
  }, [])

  if (loading) return <Screen><p style={{ color:'#6b74b8', fontSize:20, fontWeight:700 }}>جاري الاتصال بالغرفة…</p></Screen>
  if (error)   return <Screen><p style={{ color:'#e63946', fontSize:18, fontWeight:700 }}>الغرفة غير موجودة: {roomId}</p></Screen>
  if (!game)   return null

  // Active question from game.questions (same source as host)
  let activeQ: { q:string; a:string; pts:number; diff:string; catName:string; catEmoji:string; team:'a'|'b' } | null = null
  if (game.activeCard && game.phase === 'game' && game.questions) {
    const [colStr, rowStr] = game.activeCard.split('-')
    const col = parseInt(colStr), row = parseInt(rowStr)
    const cid = game.categories[col]
    if (cid) {
      const cat = allCats.find(c => c.id === cid) ?? BUILT_IN_CATS.find(c => c.id === cid)
      const q   = game.questions[cid]?.[row]
      if (q && cat) {
        activeQ = {
          q: q.q, a: q.a,
          pts:      DIFFICULTY_POINTS[q.difficulty as keyof typeof DIFFICULTY_POINTS ?? 'medium'],
          diff:     q.difficulty ?? 'medium',
          catName:  cat.name,
          catEmoji: cat.emoji,
          team:     col < 3 ? 'a' : 'b',
        }
      }
    }
  }

  const isTimerActive = timerState.running || timerState.expired

  return (
    <div style={{ background:'#080a10', fontFamily:'Tajawal, sans-serif', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', background:'rgba(8,10,16,.95)', borderBottom:'1px solid #252b55', flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:900, background:'linear-gradient(90deg,#e63946,#ffd60a,#06d6a0)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          حزر فزر
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <ScoreChip color="#e63946" name={game.teamA.name} score={game.teamA.score} active={game.turn==='a'} />
          <span style={{ color:'#6b74b8', fontSize:14 }}>ضد</span>
          <ScoreChip color="#06d6a0" name={game.teamB.name} score={game.teamB.score} active={game.turn==='b'} />
        </div>
        <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'#181c3a', border:'1px solid #252b55', color:'#9099d0' }}>
          {roomId}
        </span>
      </header>

      {/* DRAFT — live view */}
      {game.phase === 'draft' && (
        <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', maxWidth:860, width:'100%', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:14, padding:'10px 20px', borderRadius:14, fontWeight:700, fontSize:16,
            background: game.categories.length < 6 ? (DRAFT_ORDER[game.categories.length]==='a'?'rgba(230,57,70,.15)':'rgba(6,214,160,.1)') : 'rgba(255,214,10,.1)',
            border: `1px solid ${game.categories.length < 6 ? (DRAFT_ORDER[game.categories.length]==='a'?'#e63946':'#06d6a0') : '#ffd60a'}`,
            color: game.categories.length < 6 ? (DRAFT_ORDER[game.categories.length]==='a'?'#e63946':'#06d6a0') : '#ffd60a' }}>
            {game.categories.length < 6
              ? `🎯 فريق ${DRAFT_ORDER[game.categories.length]==='a' ? game.teamA.name : game.teamB.name} يختار الآن…`
              : '✓ تم اختيار جميع الفئات — اللعبة على وشك البدء!'}
          </div>

          {/* Picks panels */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            {(['a','b'] as const).map(t => (
              <div key={t} style={{ background:'#10132a', border:`1px solid ${t==='a'?'#e63946':'#06d6a0'}33`, borderRadius:14, padding:'12px 14px' }}>
                <div style={{ fontSize:13, fontWeight:900, color:t==='a'?'#e63946':'#06d6a0', marginBottom:8 }}>
                  اختيارات فريق {t==='a'?game.teamA.name:game.teamB.name}
                </div>
                {[0,1,2].map(i => {
                  const catId = game.categories.filter((_: string, idx: number) => DRAFT_ORDER[idx]===t)[i]
                  const cat   = catId ? allCats.find(c => c.id === catId) : null
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, marginBottom:6,
                      background: cat?(t==='a'?'rgba(230,57,70,.08)':'rgba(6,214,160,.06)'):'#181c3a',
                      border: `1px ${cat?'solid':'dashed'} ${cat?(t==='a'?'#e63946':'#06d6a0'):'#252b55'}` }}>
                      {cat
                        ? <><span style={{ fontSize:18 }}>{cat.emoji}</span><span style={{ fontSize:14, fontWeight:700, color:t==='a'?'#e63946':'#06d6a0' }}>{cat.name}</span></>
                        : <span style={{ fontSize:13, color:'#6b74b8' }}>اختيار {i+1}…</span>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* All categories */}
          <div style={{ fontSize:12, fontWeight:700, color:'#6b74b8', marginBottom:8 }}>الفئات المتاحة</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:8 }}>
            {allCats.map(cat => {
              const idx  = game.categories.indexOf(cat.id)
              const picked = idx !== -1
              const team = picked ? DRAFT_ORDER[idx] : null
              return (
                <div key={cat.id} style={{
                  background: team==='a'?'rgba(230,57,70,.1)':team==='b'?'rgba(6,214,160,.07)':'#10132a',
                  border: team==='a'?'1px solid #e63946':team==='b'?'1px solid #06d6a0':'1px solid #252b55',
                  borderRadius:10, padding:'10px 10px', textAlign:'right', opacity:picked?1:0.65 }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{cat.emoji}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#e8eaf6' }}>{cat.name}</div>
                  {team && <div style={{ fontSize:10, fontWeight:700, marginTop:4, color:team==='a'?'#e63946':'#06d6a0' }}>✓ {team==='a'?game.teamA.name:game.teamB.name}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* GAME — contained grid */}
      {game.phase === 'game' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'8px 10px', gap:5, minHeight:0 }}>

          {/* Category headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:4, flexShrink:0 }}>
            {game.categories.map((cid: string, i: number) => {
              const cat = allCats.find(c => c.id === cid) ?? BUILT_IN_CATS.find(c => c.id === cid)
              const t   = i < 3 ? 'a' : 'b'
              return (
                <div key={cid} style={{
                  background: t==='a'?'rgba(230,57,70,.06)':'rgba(6,214,160,.04)',
                  border:'1px solid #252b55', borderTop:`2px solid ${t==='a'?'#e63946':'#06d6a0'}`,
                  borderRadius:8, padding:'5px 3px', textAlign:'center',
                  fontSize:11, fontWeight:700, color:t==='a'?'#e63946':'#06d6a0',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {cat?.emoji} {cat?.name}
                </div>
              )
            })}
          </div>

          {/* Grid — fills height */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gridTemplateRows:'repeat(6,1fr)', gap:4, flex:1, minHeight:0 }}>
            {Array.from({ length: 6 }, (_, row) =>
              game.categories.map((cid: string, col: number) => {
                const key    = `${col}-${row}`
                const result = game.answered[key]
                const q      = game.questions?.[cid]?.[row]
                const diff   = q?.difficulty ?? 'medium'
                const pts    = DIFFICULTY_POINTS[diff as keyof typeof DIFFICULTY_POINTS]
                const isActive = game.activeCard === key
                return (
                  <div key={key} style={{
                    background: result==='a'?'rgba(230,57,70,.2)':result==='b'?'rgba(6,214,160,.15)':result==='x'?'rgba(60,60,80,.3)':isActive?'rgba(255,214,10,.15)':'#181c3a',
                    border: result==='a'?'2px solid #e63946':result==='b'?'2px solid #06d6a0':result==='x'?'1px solid #444':isActive?'2px solid #ffd60a':'1px solid #252b55',
                    borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
                    opacity:result==='x'?0.4:1, transform:isActive&&!result?'scale(1.04)':'scale(1)', transition:'transform .3s',
                  }}>
                    {!result && (
                      <>
                        <span style={{ fontSize:15, fontWeight:900, color:'#ffd60a', lineHeight:1 }}>{pts}</span>
                        <span style={{ fontSize:9, fontWeight:700, color:DIFFICULTY_COLOR[diff as keyof typeof DIFFICULTY_COLOR] }}>
                          {DIFFICULTY_LABEL[diff as keyof typeof DIFFICULTY_LABEL]}
                        </span>
                      </>
                    )}
                    {result && result !== 'x' && (
                      <span style={{ fontSize:12, fontWeight:900, color:result==='a'?'#e63946':'#06d6a0' }}>
                        {result==='a'?game.teamA.name.slice(0,4):game.teamB.name.slice(0,4)}
                      </span>
                    )}
                    {result === 'x' && <span style={{ color:'#555', fontSize:16 }}>—</span>}
                  </div>
                )
              })
            )}
          </div>

          {!activeQ && !isTimerActive && (
            <div style={{ textAlign:'center', paddingTop:4, color:'#6b74b8', fontSize:14, flexShrink:0 }}>
              في انتظار المضيف لاختيار سؤال…
            </div>
          )}
        </div>
      )}

      {/* FULL-SCREEN QUESTION OVERLAY */}
      {activeQ && game.phase === 'game' && (
        <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ width:'100%', maxWidth:680, display:'flex', flexDirection:'column', gap:16 }}>

            {/* Category + difficulty + points */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:28 }}>{activeQ.catEmoji}</span>
                <span style={{ fontSize:18, fontWeight:700, color:activeQ.team==='a'?'#e63946':'#06d6a0' }}>{activeQ.catName}</span>
                <span style={{ fontSize:13, fontWeight:700, padding:'3px 12px', borderRadius:20,
                  color:DIFFICULTY_COLOR[activeQ.diff as keyof typeof DIFFICULTY_COLOR],
                  background:`${DIFFICULTY_COLOR[activeQ.diff as keyof typeof DIFFICULTY_COLOR]}22`,
                  border:`1px solid ${DIFFICULTY_COLOR[activeQ.diff as keyof typeof DIFFICULTY_COLOR]}` }}>
                  {DIFFICULTY_LABEL[activeQ.diff as keyof typeof DIFFICULTY_LABEL]}
                </span>
              </div>
              <span style={{ fontSize:36, fontWeight:900, color:'#ffd60a' }}>{activeQ.pts} <span style={{ fontSize:16, color:'#6b74b8', fontWeight:400 }}>نقطة</span></span>
            </div>

            {/* Timer */}
            {isTimerActive && (
              <div style={{ background:'#10132a', border:'1px solid #252b55', borderRadius:12, padding:'10px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:timerState.phase===1?'#ffd60a':'#9099d0' }}>
                    {timerState.phase===1
                      ? `دور ${timerState.mainTeam==='a'?game.teamA.name:game.teamB.name}`
                      : `فرصة ${timerState.mainTeam==='a'?game.teamB.name:game.teamA.name}`}
                  </span>
                  <span style={{ fontSize:34, fontWeight:900, color:timerState.secs<=10?'#e63946':'#ffd60a', fontVariantNumeric:'tabular-nums' }}>
                    {Math.max(0, timerState.secs)}
                  </span>
                </div>
                <div style={{ height:6, background:'#1f244a', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${Math.max(0,timerState.secs/timerState.max*100)}%`, height:'100%', borderRadius:3, transition:'width .95s linear', background:timerState.secs<=10?'#e63946':timerState.phase===1?'#ffd60a':'#9099d0' }} />
                </div>
                <div style={{ display:'flex', gap:8, marginTop:5 }}>
                  <div style={{ flex:1, height:3, borderRadius:2, background:timerState.phase===1?'#ffd60a':'#303870' }} />
                  <div style={{ flex:1, height:3, borderRadius:2, background:timerState.phase===2?'#ffd60a':'#1f244a' }} />
                </div>
              </div>
            )}

            {/* Question */}
            <div style={{ fontSize:26, fontWeight:700, color:'#e8eaf6', lineHeight:1.9, paddingRight:16, borderRight:'4px solid #ffd60a', minHeight:80 }}>
              {activeQ.q}
            </div>

            {/* Answer — shown when host reveals */}
            {game.activeCardAnswer && (
              <div style={{ background:'rgba(255,214,10,.08)', border:'1px solid rgba(255,214,10,.4)', borderRadius:14, padding:'16px 20px', fontSize:24, fontWeight:700, color:'#ffd60a', textAlign:'center' }}>
                ✓ {game.activeCardAnswer}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENDED */}
      {game.phase === 'ended' && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:54, marginBottom:10 }}>🏆</div>
            <p style={{ fontSize:26, fontWeight:900, color:'#ffd60a', marginBottom:8 }}>انتهت اللعبة!</p>
            <p style={{ fontSize:22, fontWeight:900, color:game.teamA.score>=game.teamB.score?'#e63946':'#06d6a0' }}>
              {game.teamA.score>=game.teamB.score?game.teamA.name:game.teamB.name} يفوز! 🎉
            </p>
            <p style={{ fontSize:18, marginTop:10, color:'#9099d0' }}>
              {game.teamA.name}: <strong style={{color:'#e63946'}}>{game.teamA.score}</strong>
              {' — '}
              {game.teamB.name}: <strong style={{color:'#06d6a0'}}>{game.teamB.score}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreChip({ color, name, score, active }: { color:string; name:string; score:number; active:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:`${color}22`, border:`1px solid ${active?'#ffd60a':color}55`, color, boxShadow:active?'0 0 10px rgba(255,214,10,.3)':'none' }}>
      <span style={{ fontSize:14, fontWeight:700 }}>{name}</span>
      <span style={{ fontSize:18, fontWeight:900, fontVariantNumeric:'tabular-nums' }}>{score}</span>
    </div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080a10', fontFamily:'Tajawal, sans-serif', color:'#e8eaf6' }}>
      {children}
    </div>
  )
}
