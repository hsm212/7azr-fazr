'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { ALL_CATS } from '@/lib/categories'
import { fetchAllQuestions, saveQuestion, deleteQuestion } from '@/hooks/useGame'
import type { Question } from '@/types/game'

const EDITOR_PASSWORD = process.env.NEXT_PUBLIC_EDITOR_PASSWORD ?? 'seen-jeem-admin'

export default function EditorPage() {
  const [authed,    setAuthed]    = useState(false)
  const [password,  setPassword]  = useState('')
  const [catId,     setCatId]     = useState(ALL_CATS[0].id)
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQ,      setNewQ]      = useState('')
  const [newA,      setNewA]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Load questions for selected category
  useEffect(() => {
    if (!authed) return
    setLoading(true)
    fetchAllQuestions(catId)
      .then(qs => { setQuestions(qs); setLoading(false) })
      .catch(() => setLoading(false))
  }, [catId, authed])

  const handleAuth = () => {
    if (password === EDITOR_PASSWORD) setAuthed(true)
    else showToast('كلمة المرور غير صحيحة')
  }

  const handleSave = async () => {
    if (!newQ.trim() || !newA.trim()) return
    setSaving(true)
    try {
      await saveQuestion(catId, newQ.trim(), newA.trim())
      setNewQ('')
      setNewA('')
      const updated = await fetchAllQuestions(catId)
      setQuestions(updated)
      showToast('✓ تم حفظ السؤال')
    } catch (e) {
      showToast('خطأ في الحفظ')
    }
    setSaving(false)
  }

  const handleDelete = async (qId: string) => {
    if (!confirm('هل تريد حذف هذا السؤال؟')) return
    await deleteQuestion(catId, qId)
    setQuestions(qs => qs.filter(q => q.id !== qId))
    showToast('تم الحذف')
  }

  const selectedCat = ALL_CATS.find(c => c.id === catId)!

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: '#080a10', fontFamily: 'Tajawal, sans-serif' }}>
        <div className="w-full max-w-sm rounded-2xl p-7"
          style={{ background: '#10132a', border: '1px solid #252b55' }}>
          <h1 className="text-xl font-black text-center mb-6" style={{ color: '#ffd60a' }}>
            🔑 محرر الأسئلة
          </h1>
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            className="w-full px-4 py-3 rounded-xl text-right outline-none mb-4"
            style={{ background: '#181c3a', border: '1px solid #252b55', color: '#e8eaf6' }}
          />
          <button onClick={handleAuth}
            className="w-full py-3 rounded-xl font-black text-base"
            style={{ background: '#e63946', color: '#fff' }}>
            دخول
          </button>
          {toast && <p className="text-center text-sm mt-3" style={{ color: '#e63946' }}>{toast}</p>}
        </div>
      </div>
    )
  }

  // ── Editor ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-6" style={{ background: '#080a10', fontFamily: 'Tajawal, sans-serif' }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black" style={{ color: '#ffd60a' }}>✏️ محرر الأسئلة</h1>
          <a href="/" className="text-sm px-4 py-2 rounded-xl font-bold"
            style={{ background: '#181c3a', border: '1px solid #252b55', color: '#9099d0' }}>
            → الرئيسية
          </a>
        </div>

        {/* Category selector */}
        <div className="grid gap-2 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))' }}>
          {ALL_CATS.map(cat => (
            <button key={cat.id} onClick={() => setCatId(cat.id)}
              className="rounded-xl py-2 px-3 text-right text-sm font-bold transition-all"
              style={{
                background: catId === cat.id ? 'rgba(255,214,10,.1)' : '#10132a',
                border:     catId === cat.id ? '1px solid #ffd60a' : '1px solid #252b55',
                color:      catId === cat.id ? '#ffd60a' : '#9099d0',
                fontFamily: 'Tajawal, sans-serif',
              }}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>

        {/* Add new question */}
        <div className="rounded-2xl p-5 mb-5"
          style={{ background: '#10132a', border: '1px solid #252b55' }}>
          <h2 className="font-black mb-4 text-base" style={{ color: '#e8eaf6' }}>
            إضافة سؤال — {selectedCat.emoji} {selectedCat.name}
          </h2>
          <textarea
            placeholder="نص السؤال بالعربي…"
            value={newQ}
            onChange={e => setNewQ(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl text-right outline-none mb-3 resize-none text-base"
            style={{ background: '#181c3a', border: '1px solid #252b55', color: '#e8eaf6', fontFamily: 'Tajawal, sans-serif' }}
          />
          <textarea
            placeholder="الإجابة الصحيحة…"
            value={newA}
            onChange={e => setNewA(e.target.value)}
            rows={1}
            className="w-full px-4 py-3 rounded-xl text-right outline-none mb-4 resize-none text-base"
            style={{ background: '#181c3a', border: '1px solid rgba(255,214,10,.3)', color: '#ffd60a', fontFamily: 'Tajawal, sans-serif' }}
          />
          <button onClick={handleSave} disabled={saving || !newQ.trim() || !newA.trim()}
            className="px-6 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40"
            style={{ background: '#e63946', color: '#fff' }}>
            {saving ? 'جاري الحفظ…' : '+ حفظ السؤال'}
          </button>
        </div>

        {/* Questions list */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#10132a', border: '1px solid #252b55' }}>
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid #252b55' }}>
            <span className="font-black" style={{ color: '#e8eaf6' }}>
              الأسئلة الحالية ({questions.length})
            </span>
            <span className="text-xs" style={{ color: '#6b74b8' }}>
              {questions.length >= 6
                ? `✓ يكفي للعب (${questions.length} سؤال)`
                : `⚠ تحتاج ${6 - questions.length} أسئلة إضافية على الأقل`}
            </span>
          </div>

          {loading && (
            <div className="p-8 text-center" style={{ color: '#6b74b8' }}>جاري التحميل…</div>
          )}

          {!loading && questions.length === 0 && (
            <div className="p-8 text-center" style={{ color: '#6b74b8' }}>
              لا توجد أسئلة بعد — أضف أسئلتك أعلاه
            </div>
          )}

          {!loading && questions.map((q, i) => (
            <div key={q.id} className="px-5 py-4 flex items-start gap-4"
              style={{ borderBottom: i < questions.length - 1 ? '1px solid #181c3a' : 'none' }}>
              <span className="text-xs font-black mt-1 min-w-6 text-center py-0.5 rounded"
                style={{ background: '#181c3a', color: '#6b74b8' }}>
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm mb-1" style={{ color: '#e8eaf6' }}>{q.q}</p>
                <p className="text-xs" style={{ color: '#ffd60a' }}>✓ {q.a}</p>
              </div>
              <button onClick={() => handleDelete(q.id!)}
                className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80 flex-shrink-0"
                style={{ background: 'rgba(230,57,70,.1)', border: '1px solid rgba(230,57,70,.3)', color: '#e63946' }}>
                حذف
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-xl font-bold text-sm"
          style={{ background: '#181c3a', border: '1px solid #ffd60a', color: '#ffd60a' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
