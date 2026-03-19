'use client'
export const dynamic = 'force-dynamic'
import { useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { useGame, fetchQuestions, fetchAllCategories } from '@/hooks/useGame'
import { useTimer } from '@/hooks/useTimer'
import { BUILT_IN_CATS, DIFFICULTY_POINTS, DIFFICULTY_LABEL, DIFFICULTY_COLOR } from '@/lib/categories'
import type { Category } from '@/types/game'

const DRAFT_ORDER = ['a','b','b','a','a','b'] as const

// Overlay has 3 stages:
//  'asking'   — 60s for active team, host sees "Team answered" button
//  'stealing' — 30s for opponent to steal
//  'revealed' — timer expired OR host revealed; award / "لا إجابة" visible
type OverlayStage = 'asking' | 'stealing' | 'revealed'

export default function HostPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { game, loading, error, setCategories, openCard, awardPoints, cancelCard, revealAnswer, patch } = useGame(roomId)
  const { timerState, startTimer, startPhase2, stopTimer } = useTimer(roomId, true)

  const [draftStep, setDraftStep] = useState(0)
  const [allCats, setAllCats]     = useState<Category[]>(BUILT_IN_CATS)
  const [activeQ, setActiveQ]     = useState<{
    key: string; cid: string; row: number; pts: number; answer: string; imageUrl?: string
  } | null>(null)
  const [stage, setStage]         = useState<OverlayStage>('asking')
  const [toast, setToast]         = useState('')

  useEffect(() => {
    fetchAllCategories().then(setAllCats).catch(() => setAllCats(BUILT_IN_CATS))
  }, [])

  // Save questions to Firestore when game starts
  useEffect(() => {
    if (!game || game.phase !== 'game' || game.categories.length !== 6) return
    if (game.questions && Object.keys(game.questions).length === 6) return
    const load = async () => {
      const qmap: Record<string, { q: string; a: string; difficulty: string }[]> = {}
      for (const cid of game.categories) {
        const fetched = await fetchQuestions(cid)
        qmap[cid] = fetched.map(({ q, a, difficulty }) => ({ q, a, difficulty: difficulty ?? 'medium' }))
      }
      await patch({ questions: qmap })
    }
    load()
  }, [game?.phase, game?.categories?.join(',')])

  // When timer expires → move to 'revealed' stage (overlay stays open, answer NOT auto-revealed)
  useEffect(() => {
    if (!timerState.expired || !activeQ) return
    setStage('revealed')
  }, [timerState.expired])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const getQ = useCallback((cid: string, row: number) =>
    game?.questions?.[cid]?.[row] ?? { q: 'جاري التحميل…', a: '', difficulty: 'medium' },
    [game?.questions])

  const pickCat = async (catId: string) => {
    if (!game || draftStep >= 6 || game.categories.includes(catId)) return
    await setCategories([...game.categories, catId])
    setDraftStep(s => s + 1)
  }

  const handleCardClick = async (key: string, cid: string, row: number) => {
    if (!game || game.answered[key] || !game.questions?.[cid]) return
    const q   = game.questions[cid][row]
    const pts = DIFFICULTY_POINTS[q?.difficulty as keyof typeof DIFFICULTY_POINTS ?? 'medium']
    await openCard(key)
    setActiveQ({ key, cid, row, pts, answer: q?.a ?? '', imageUrl: q?.imageUrl })
    setStage('asking')
    startTimer(game.turn)
  }

  // Host confirms active team answered → start 30s steal timer for opponent
  const handleTeamAnswered = () => {
    if (!activeQ || !game) return
    const opponent = game.turn === 'a' ? 'b' : 'a'
    startPhase2(opponent === 'a' ? 'b' : 'a') // mainTeam is the one who answered
    setStage('stealing')
  }

  // Reveal answer to all without closing
  const handleReveal = async () => {
    if (!activeQ) return
    await revealAnswer(activeQ.answer)
    setStage('revealed')
  }

  // Award points and close
  const handleAward = async (team: 'a' | 'b') => {
    if (!activeQ) return
    stopTimer()
    await awardPoints(team, activeQ.key, activeQ.pts, activeQ.answer)
    showToast(`+${activeQ.pts} نقطة ← ${team === 'a' ? game?.teamA.name : game?.teamB.name}`)
    setActiveQ(null)
  }

  // No answer — reveal then close
  const handleNoAnswer = async () => {
    if (!activeQ) return
    stopTimer()
    await revealAnswer(activeQ.answer)
    // Small delay so guests see the answer before closing
    setTimeout(async () => {
      await cancelCard(activeQ.key, activeQ.answer)
      setActiveQ(null)
    }, 1500)
    showToast('لا إجابة — تم الكشف عن الجواب')
  }

  if (loading) return <Screen><p style={{ color:'#6b74b8', fontSize:20, fontWeight:700 }}>جاري التحميل…</p></Screen>
  if (error)   return <Screen><p style={{ color:'#e63946', fontSize:18, fontWeight:700 }}>خطأ: {error}</p></Screen>
  if (!game)   return null

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/game/${roomId}` : ''
  const questionsReady = game.questions && Object.keys(game.questions).length === 6

  const activeTeamName    = game.turn === 'a' ? game.teamA.name : game.teamB.name
  const opponentTeamName  = game.turn === 'a' ? game.teamB.name : game.teamA.name

  return (
    <div style={{ background:'#080a10', fontFamily:'Tajawal, sans-serif', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Header ── */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px', background:'rgba(8,10,16,.95)', borderBottom:'1px solid #252b55', flexShrink:0 }}>
        <div style={{ fontSize:22, fontWeight:900, background:'linear-gradient(90deg,#e63946,#ffd60a,#06d6a0)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          حزر فزر — المضيف
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <ScoreChip color="#e63946" name={game.teamA.name} score={game.teamA.score} active={game.turn==='a'} />
          <span style={{ color:'#6b74b8', fontSize:14 }}>ضد</span>
          <ScoreChip color="#06d6a0" name={game.teamB.name} score={game.teamB.score} active={game.turn==='b'} />
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:12, padding:'4px 12px', borderRadius:20, background:'#181c3a', border:'1px solid #252b55', color:'#9099d0' }}>
            كود: <span style={{ color:'#ffd60a', fontWeight:900 }}>{roomId}</span>
          </span>
          <button onClick={() => navigator.clipboard.writeText(shareUrl)}
            style={{ fontSize:12, padding:'4px 12px', borderRadius:20, background:'#181c3a', border:'1px solid #ffd60a', color:'#ffd60a', cursor:'pointer' }}>
            نسخ رابط اللاعبين
          </button>
        </div>
      </header>

      {/* ── Draft ── */}
      {game.phase === 'draft' && (
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', maxWidth:900, width:'100%', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:16, padding:'10px 24px', borderRadius:14, fontWeight:700, fontSize:16,
            background: draftStep < 6 ? (DRAFT_ORDER[draftStep]==='a'?'rgba(230,57,70,.15)':'rgba(6,214,160,.1)') : 'rgba(255,214,10,.1)',
            border: `1px solid ${draftStep < 6 ? (DRAFT_ORDER[draftStep]==='a'?'#e63946':'#06d6a0') : '#ffd60a'}`,
            color: draftStep < 6 ? (DRAFT_ORDER[draftStep]==='a'?'#e63946':'#06d6a0') : '#ffd60a' }}>
            {draftStep < 6
              ? `فريق ${DRAFT_ORDER[draftStep]==='a' ? game.teamA.name : game.teamB.name} — اختر فئتك ${['الأولى','الثانية','الثالثة','الأولى','الثانية','الثالثة'][draftStep]}`
              : '✓ تم اختيار جميع الفئات — اللعبة جاهزة!'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
            {allCats.map(cat => {
              const idx    = game.categories.indexOf(cat.id)
              const picked = idx !== -1
              const team   = picked ? DRAFT_ORDER[idx] : null
              return (
                <button key={cat.id} onClick={() => !picked && draftStep < 6 && pickCat(cat.id)}
                  disabled={picked || draftStep >= 6}
                  style={{ background:team==='a'?'rgba(230,57,70,.1)':team==='b'?'rgba(6,214,160,.07)':'#10132a', border:team==='a'?'1px solid #e63946':team==='b'?'1px solid #06d6a0':'1px solid #252b55', borderRadius:12, padding:'12px 10px', textAlign:'right', cursor:picked||draftStep>=6?'default':'pointer', opacity:picked||draftStep>=6?0.7:1, fontFamily:'Tajawal, sans-serif', transition:'all .2s' }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{cat.emoji}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#e8eaf6' }}>{cat.name}</div>
                  {cat.custom && <div style={{ fontSize:10, color:'#6b74b8', marginTop:2 }}>مخصص</div>}
                  {team && <div style={{ fontSize:11, fontWeight:700, marginTop:6, color:team==='a'?'#e63946':'#06d6a0' }}>✓ {team==='a'?game.teamA.name:game.teamB.name}</div>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Game board ── */}
      {game.phase === 'game' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'8px 12px', gap:6, minHeight:0 }}>
          {!questionsReady && (
            <div style={{ textAlign:'center', padding:'6px', fontSize:14, fontWeight:700, color:'#ffd60a', background:'rgba(255,214,10,.08)', border:'1px solid rgba(255,214,10,.2)', borderRadius:8, flexShrink:0 }}>
              ⏳ جاري تحميل الأسئلة…
            </div>
          )}

          {/* Category headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:5, flexShrink:0 }}>
            {game.categories.map((cid: string, i: number) => {
              const cat = allCats.find(c => c.id === cid) ?? BUILT_IN_CATS.find(c=>c.id===cid)
              const t   = i < 3 ? 'a' : 'b'
              return (
                <div key={cid} style={{ background:t==='a'?'rgba(230,57,70,.06)':'rgba(6,214,160,.04)', border:'1px solid #252b55', borderTop:`2px solid ${t==='a'?'#e63946':'#06d6a0'}`, borderRadius:8, padding:'6px 4px', textAlign:'center', fontSize:12, fontWeight:700, color:t==='a'?'#e63946':'#06d6a0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {cat?.emoji} {cat?.name}
                </div>
              )
            })}
          </div>

          {/* Question grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gridTemplateRows:'repeat(6,1fr)', gap:5, flex:1, minHeight:0 }}>
            {Array.from({ length: 6 }, (_, row) =>
              game.categories.map((cid: string, col: number) => {
                const key    = `${col}-${row}`
                const result = game.answered[key]
                const q      = game.questions?.[cid]?.[row]
                const diff   = q?.difficulty ?? 'medium'
                const pts    = DIFFICULTY_POINTS[diff as keyof typeof DIFFICULTY_POINTS]
                const isOpen = activeQ?.key === key
                const teamName = result === 'a' ? game.teamA.name : result === 'b' ? game.teamB.name : null
                return (
                  <button key={key} onClick={() => questionsReady && !result && handleCardClick(key, cid, row)}
                    style={{ background:result==='a'?'rgba(230,57,70,.2)':result==='b'?'rgba(6,214,160,.15)':result==='x'?'rgba(60,60,80,.3)':isOpen?'rgba(255,214,10,.15)':'#181c3a', border:result==='a'?'2px solid #e63946':result==='b'?'2px solid #06d6a0':result==='x'?'1px solid #444':isOpen?'2px solid #ffd60a':'1px solid #252b55', borderRadius:10, cursor:result||!questionsReady?'default':'pointer', opacity:result==='x'?0.4:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:4, minHeight:0, overflow:'hidden' }}>
                    {!result && (
                      <>
                        <span style={{ fontSize:16, fontWeight:900, color:'#ffd60a', lineHeight:1 }}>{pts}</span>
                        <span style={{ fontSize:10, fontWeight:700, color:DIFFICULTY_COLOR[diff as keyof typeof DIFFICULTY_COLOR] }}>
                          {DIFFICULTY_LABEL[diff as keyof typeof DIFFICULTY_LABEL]}
                        </span>
                      </>
                    )}
                    {/* ── Fix: full team name, scaled to fit, no truncation ── */}
                    {teamName && (
                      <span style={{ fontSize:11, fontWeight:900, color:result==='a'?'#e63946':'#06d6a0', textAlign:'center', wordBreak:'break-word', lineHeight:1.2, padding:'0 2px' }}>
                        {teamName}
                      </span>
                    )}
                    {result === 'x' && <span style={{ color:'#555', fontSize:16 }}>—</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── Full-screen question overlay ── */}
      {activeQ && game.phase === 'game' && (
        <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,.95)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, backdropFilter:'blur(8px)', overflowY:'auto' }}>
          <div style={{ width:'100%', maxWidth:700, display:'flex', flexDirection:'column', gap:16 }}>

            {/* Timer */}
            <div style={{ background:'#10132a', border:'1px solid #252b55', borderRadius:14, padding:'12px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:15, fontWeight:700, color:timerState.phase===1?'#ffd60a':'#9099d0' }}>
                  {stage === 'asking'
                    ? `دور ${activeTeamName} — ٦٠ث`
                    : stage === 'stealing'
                    ? `فرصة سرقة ${opponentTeamName} — ٣٠ث`
                    : 'انتهى الوقت'}
                </span>
                <span style={{ fontSize:40, fontWeight:900, color:timerState.secs<=10?'#e63946':'#ffd60a', fontVariantNumeric:'tabular-nums' }}>
                  {Math.max(0, timerState.secs)}
                </span>
              </div>
              <div style={{ height:6, background:'#1f244a', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${Math.max(0,timerState.secs/timerState.max*100)}%`, height:'100%', borderRadius:3, transition:'width .95s linear', background:timerState.secs<=10?'#e63946':stage==='asking'?'#ffd60a':'#9099d0' }} />
              </div>
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <div style={{ flex:1, height:3, borderRadius:2, background:stage==='asking'?'#ffd60a':'#303870' }} />
                <div style={{ flex:1, height:3, borderRadius:2, background:stage==='stealing'?'#ffd60a':'#1f244a' }} />
              </div>
            </div>

            {/* Points + difficulty */}
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <span style={{ fontSize:52, fontWeight:900, color:'#ffd60a', lineHeight:1 }}>{activeQ.pts}</span>
              <span style={{ fontSize:18, color:'#6b74b8' }}>نقطة</span>
              <span style={{ fontSize:15, fontWeight:700, padding:'4px 14px', borderRadius:20,
                color:DIFFICULTY_COLOR[getQ(activeQ.cid,activeQ.row).difficulty as keyof typeof DIFFICULTY_COLOR],
                background:`${DIFFICULTY_COLOR[getQ(activeQ.cid,activeQ.row).difficulty as keyof typeof DIFFICULTY_COLOR]}22`,
                border:`1px solid ${DIFFICULTY_COLOR[getQ(activeQ.cid,activeQ.row).difficulty as keyof typeof DIFFICULTY_COLOR]}` }}>
                {DIFFICULTY_LABEL[getQ(activeQ.cid,activeQ.row).difficulty as keyof typeof DIFFICULTY_LABEL]}
              </span>
            </div>

            {/* Question */}
            <div style={{ fontSize:28, fontWeight:700, color:'#e8eaf6', lineHeight:1.9, paddingRight:18, borderRight:'4px solid #ffd60a' }}>
              {getQ(activeQ.cid, activeQ.row).q}
            </div>

            {/* Image */}
            {activeQ.imageUrl && (
              <div style={{ borderRadius:14, overflow:'hidden', maxHeight:260, background:'#0f1228', border:'1px solid #252b55' }}>
                <img src={activeQ.imageUrl} alt="" style={{ width:'100%', maxHeight:260, objectFit:'contain', display:'block' }}
                  onError={e => (e.currentTarget.parentElement!.style.display='none')} />
              </div>
            )}

            {/* Answer — shown once revealed */}
            {game.activeCardAnswer && (
              <div style={{ background:'rgba(255,214,10,.08)', border:'2px solid rgba(255,214,10,.4)', borderRadius:12, padding:'14px 18px', fontSize:22, fontWeight:700, color:'#ffd60a' }}>
                ✓ {game.activeCardAnswer}
              </div>
            )}

            {/* ── Stage: ASKING — active team's 60s ── */}
            {stage === 'asking' && (
              <div style={{ display:'flex', gap:10 }}>
                {/* "Team answered" → start steal timer */}
                <button onClick={handleTeamAnswered}
                  style={{ flex:2, padding:'16px', borderRadius:12, background:`rgba(${game.turn==='a'?'230,57,70':'6,214,160'},.15)`, border:`2px solid ${game.turn==='a'?'#e63946':'#06d6a0'}`, color:game.turn==='a'?'#e63946':'#06d6a0', fontFamily:'Tajawal, sans-serif', fontSize:18, fontWeight:900, cursor:'pointer' }}>
                  ✋ {activeTeamName} أجاب — فرصة {opponentTeamName}
                </button>
                {/* Reveal answer without triggering steal */}
                {!game.activeCardAnswer && (
                  <button onClick={handleReveal}
                    style={{ flex:1, padding:'16px', borderRadius:12, background:'rgba(255,214,10,.08)', border:'1px solid rgba(255,214,10,.28)', color:'#ffd60a', fontFamily:'Tajawal, sans-serif', fontSize:15, fontWeight:700, cursor:'pointer' }}>
                    🔍 اكشف الإجابة
                  </button>
                )}
                <button onClick={handleNoAnswer}
                  style={{ padding:'16px 18px', borderRadius:12, background:'transparent', border:'1px solid #444', color:'#6b74b8', fontFamily:'Tajawal, sans-serif', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  لا إجابة
                </button>
              </div>
            )}

            {/* ── Stage: STEALING — opponent's 30s ── */}
            {stage === 'stealing' && (
              <div style={{ display:'flex', gap:10, flexDirection:'column' }}>
                <div style={{ textAlign:'center', padding:'10px', borderRadius:10, background:'rgba(255,214,10,.06)', border:'1px solid rgba(255,214,10,.2)', color:'#ffd60a', fontSize:14, fontWeight:700 }}>
                  فرصة السرقة — {opponentTeamName} لديهم ٣٠ ثانية
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  {/* Award active team (answered correctly in phase 1) */}
                  <button onClick={() => handleAward(game.turn)}
                    style={{ flex:1, padding:'14px', borderRadius:12, background:`rgba(${game.turn==='a'?'230,57,70':'6,214,160'},.12)`, border:`1px solid ${game.turn==='a'?'#e63946':'#06d6a0'}`, color:game.turn==='a'?'#e63946':'#06d6a0', fontFamily:'Tajawal, sans-serif', fontSize:16, fontWeight:900, cursor:'pointer' }}>
                    ✔ {activeTeamName} أجاب صح
                  </button>
                  {/* Award opponent (stole it) */}
                  <button onClick={() => handleAward(game.turn === 'a' ? 'b' : 'a')}
                    style={{ flex:1, padding:'14px', borderRadius:12, background:`rgba(${game.turn==='a'?'6,214,160':'230,57,70'},.12)`, border:`1px solid ${game.turn==='a'?'#06d6a0':'#e63946'}`, color:game.turn==='a'?'#06d6a0':'#e63946', fontFamily:'Tajawal, sans-serif', fontSize:16, fontWeight:900, cursor:'pointer' }}>
                    🔥 {opponentTeamName} سرق النقاط!
                  </button>
                  {!game.activeCardAnswer && (
                    <button onClick={handleReveal}
                      style={{ padding:'14px 14px', borderRadius:12, background:'rgba(255,214,10,.08)', border:'1px solid rgba(255,214,10,.28)', color:'#ffd60a', fontFamily:'Tajawal, sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      🔍 اكشف
                    </button>
                  )}
                  <button onClick={handleNoAnswer}
                    style={{ padding:'14px 14px', borderRadius:12, background:'transparent', border:'1px solid #444', color:'#6b74b8', fontFamily:'Tajawal, sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                    لا إجابة
                  </button>
                </div>
              </div>
            )}

            {/* ── Stage: REVEALED — timer expired, answer shown ── */}
            {stage === 'revealed' && (
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => handleAward('a')}
                  style={{ flex:1, padding:'14px', borderRadius:12, background:'rgba(230,57,70,.12)', border:'1px solid #e63946', color:'#e63946', fontFamily:'Tajawal, sans-serif', fontSize:16, fontWeight:900, cursor:'pointer' }}>
                  ✔ {game.teamA.name} أجاب صح
                </button>
                <button onClick={() => handleAward('b')}
                  style={{ flex:1, padding:'14px', borderRadius:12, background:'rgba(6,214,160,.08)', border:'1px solid #06d6a0', color:'#06d6a0', fontFamily:'Tajawal, sans-serif', fontSize:16, fontWeight:900, cursor:'pointer' }}>
                  ✔ {game.teamB.name} أجاب صح
                </button>
                <button onClick={handleNoAnswer}
                  style={{ padding:'14px 18px', borderRadius:12, background:'transparent', border:'1px solid #444', color:'#6b74b8', fontFamily:'Tajawal, sans-serif', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  لا إجابة
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Ended ── */}
      {game.phase === 'ended' && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🏆</div>
            <p style={{ fontSize:28, fontWeight:900, color:'#ffd60a', marginBottom:8 }}>انتهت اللعبة!</p>
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

      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', padding:'10px 22px', borderRadius:12, background:'#181c3a', border:'1px solid #252b55', color:'#e8eaf6', fontSize:15, fontWeight:700, zIndex:200, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function ScoreChip({ color, name, score, active }: { color:string; name:string; score:number; active:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:20, background:`${color}22`, border:`1px solid ${active?'#ffd60a':color}55`, color, boxShadow:active?'0 0 10px rgba(255,214,10,.3)':'none' }}>
      <span style={{ fontSize:15, fontWeight:700 }}>{name}</span>
      <span style={{ fontSize:20, fontWeight:900, fontVariantNumeric:'tabular-nums' }}>{score}</span>
    </div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080a10', fontFamily:'Tajawal, sans-serif', color:'#e8eaf6' }}>
      {children}
    </div>
  )
}
