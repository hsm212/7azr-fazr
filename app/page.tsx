'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, genRoomCode } from '@/hooks/useGame'

export default function LobbyPage() {
  const router            = useRouter()
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [err, setErr]     = useState('')

  const handleCreate = async () => {
    setLoading(true)
    setErr('')
    try {
      const code = genRoomCode()
      await createRoom(code, teamA, teamB)
      router.push(`/host/${code}`)
    } catch (e: any) {
      console.error('createRoom failed:', e)
      setErr(e?.message ?? 'حدث خطأ — تحقق من إعدادات Firebase')
      setLoading(false)
    }
  }

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length === 6) router.push(`/game/${code}`)
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-8 p-8"
      style={{
        background:
          'radial-gradient(ellipse at 80% 20%, rgba(230,57,70,.08) 0%, transparent 50%), ' +
          'radial-gradient(ellipse at 20% 80%, rgba(6,214,160,.08) 0%, transparent 50%), #080a10',
      }}
    >
      <div className="text-center">
        <h1 className="text-6xl font-black mb-2" style={{
          background: 'linear-gradient(90deg,#e63946,#ffd60a,#06d6a0)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>حزر فزر</h1>
        <p className="text-sm" style={{ color: '#6b74b8' }}>لعبة مسابقات ثقافية للفرق</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#10132a', border: '1px solid #252b55' }}>
        <h2 className="text-lg font-bold text-center" style={{ color: '#e8eaf6' }}>إنشاء غرفة جديدة</h2>

        <input type="text" placeholder="اسم الفريق الأول (ألفا)" value={teamA}
          onChange={e => setTeamA(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-right text-base outline-none"
          style={{ background:'#181c3a', border:'1px solid #252b55', color:'#e8eaf6' }}
        />
        <input type="text" placeholder="اسم الفريق الثاني (بيتا)" value={teamB}
          onChange={e => setTeamB(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-right text-base outline-none"
          style={{ background:'#181c3a', border:'1px solid #252b55', color:'#e8eaf6' }}
        />

        {/* Error message visible on screen */}
        {err && (
          <div className="rounded-xl px-4 py-3 text-sm font-bold text-right"
            style={{ background:'rgba(230,57,70,.15)', border:'1px solid #e63946', color:'#e63946' }}>
            ⚠ {err}
          </div>
        )}

        <button onClick={handleCreate} disabled={loading}
          className="w-full py-4 rounded-xl font-black text-lg text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
          style={{ background:'linear-gradient(135deg,#e63946,#b52d38)', boxShadow:'0 4px 18px rgba(230,57,70,.4)' }}>
          {loading ? 'جاري الإنشاء…' : '▶ ابدأ اللعبة'}
        </button>
      </div>

      <div className="flex items-center gap-4 w-full max-w-sm">
        <div className="flex-1 h-px" style={{ background:'#252b55' }} />
        <span className="text-sm" style={{ color:'#6b74b8' }}>أو</span>
        <div className="flex-1 h-px" style={{ background:'#252b55' }} />
      </div>

      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background:'#10132a', border:'1px solid #252b55' }}>
        <h2 className="text-lg font-bold text-center" style={{ color:'#e8eaf6' }}>انضم إلى غرفة</h2>
        <input type="text" placeholder="أدخل كود الغرفة" value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="w-full px-4 py-3 rounded-xl text-center text-xl font-black tracking-widest outline-none"
          style={{ background:'#181c3a', border:'1px solid #252b55', color:'#e8eaf6' }}
        />
        <button onClick={handleJoin} disabled={joinCode.trim().length !== 6}
          className="w-full py-3 rounded-xl font-black text-base transition-all hover:-translate-y-0.5 disabled:opacity-40"
          style={{ background:'#181c3a', border:'1px solid #ffd60a', color:'#ffd60a' }}>
          انضم كلاعب
        </button>
      </div>

      <p className="text-xs text-center" style={{ color:'#6b74b8' }}>
        المضيف يدير اللعبة · كل فريق يفتح الرابط على جهازه الخاص
      </p>
    </main>
  )
}
