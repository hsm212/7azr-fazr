'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, genRoomCode } from '@/hooks/useGame'

export default function LobbyPage() {
  const router          = useRouter()
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  // ── Create a new game room and go to host view ─────────────────────────────
  const handleCreate = async () => {
    setLoading(true)
    try {
      const code = genRoomCode()
      await createRoom(code, teamA, teamB)
      router.push(`/host/${code}`)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  // ── Join an existing room as a player ──────────────────────────────────────
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
      {/* Logo */}
      <div className="text-center">
        <h1
          className="text-6xl font-black mb-2"
          style={{
            background: 'linear-gradient(90deg,#e63946,#ffd60a,#06d6a0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor:  'transparent',
          }}
        >
          سين جيم
        </h1>
        <p className="text-[#6b74b8] text-sm">لعبة مسابقات ثقافية للفرق</p>
      </div>

      {/* Create room card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#10132a', border: '1px solid #252b55' }}
      >
        <h2 className="text-lg font-bold text-center text-[#e8eaf6]">
          إنشاء غرفة جديدة
        </h2>

        <input
          type="text"
          placeholder="اسم الفريق الأول (ألفا)"
          value={teamA}
          onChange={e => setTeamA(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-right text-base outline-none
                     bg-[#181c3a] border border-[#252b55] text-[#e8eaf6]
                     focus:border-[#e63946] transition-colors placeholder:text-[#6b74b8]"
        />
        <input
          type="text"
          placeholder="اسم الفريق الثاني (بيتا)"
          value={teamB}
          onChange={e => setTeamB(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-right text-base outline-none
                     bg-[#181c3a] border border-[#252b55] text-[#e8eaf6]
                     focus:border-[#06d6a0] transition-colors placeholder:text-[#6b74b8]"
        />

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-4 rounded-xl font-black text-lg text-white
                     transition-all hover:-translate-y-0.5 disabled:opacity-50
                     disabled:cursor-not-allowed"
          style={{
            background:   'linear-gradient(135deg,#e63946,#b52d38)',
            boxShadow:    '0 4px 18px rgba(230,57,70,.4)',
          }}
        >
          {loading ? 'جاري الإنشاء…' : '▶ ابدأ اللعبة'}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 w-full max-w-sm">
        <div className="flex-1 h-px" style={{ background: '#252b55' }} />
        <span className="text-[#6b74b8] text-sm">أو</span>
        <div className="flex-1 h-px" style={{ background: '#252b55' }} />
      </div>

      {/* Join room card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#10132a', border: '1px solid #252b55' }}
      >
        <h2 className="text-lg font-bold text-center text-[#e8eaf6]">
          انضم إلى غرفة
        </h2>
        <input
          type="text"
          placeholder="أدخل كود الغرفة"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="w-full px-4 py-3 rounded-xl text-center text-xl font-black
                     tracking-widest outline-none bg-[#181c3a] border border-[#252b55]
                     text-[#e8eaf6] focus:border-[#ffd60a] transition-colors
                     placeholder:text-[#6b74b8] placeholder:font-normal placeholder:tracking-normal"
        />
        <button
          onClick={handleJoin}
          disabled={joinCode.trim().length !== 6}
          className="w-full py-3 rounded-xl font-black text-base transition-all
                     hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: '#181c3a',
            border:     '1px solid #ffd60a',
            color:      '#ffd60a',
          }}
        >
          انضم كلاعب
        </button>
      </div>

      <p className="text-[#6b74b8] text-xs text-center">
        المضيف يدير اللعبة · كل فريق يفتح الرابط على جهازه الخاص
      </p>
    </main>
  )
}
