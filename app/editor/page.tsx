'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { BUILT_IN_CATS, DIFFICULTY_LABEL, DIFFICULTY_COLOR } from '@/lib/categories'
import {
  fetchAllQuestions, saveQuestion, updateQuestion, deleteQuestion,
  saveCustomCategory, fetchCustomCategories, deleteCustomCategory,
} from '@/hooks/useGame'
import type { Question, Category, Difficulty } from '@/types/game'

const EDITOR_PASSWORD = process.env.NEXT_PUBLIC_EDITOR_PASSWORD ?? '7azr-fazr-admin'

type QForm = { q: string; a: string; difficulty: Difficulty; imageUrl: string }
const EMPTY_FORM: QForm = { q: '', a: '', difficulty: 'easy', imageUrl: '' }

const inp = {
  padding: '9px 12px', borderRadius: 8,
  background: '#181c3a', border: '1px solid #303870',
  color: '#e8eaf6', fontFamily: 'Tajawal, sans-serif',
  fontSize: 14, textAlign: 'right' as const, boxSizing: 'border-box' as const,
  width: '100%',
}

export default function EditorPage() {
  const [authed,    setAuthed]    = useState(false)
  const [password,  setPassword]  = useState('')
  const [pwError,   setPwError]   = useState(false)
  const [toast,     setToast]     = useState('')
  const [allCats,   setAllCats]   = useState<Category[]>([...BUILT_IN_CATS])
  const [open,      setOpen]      = useState<Record<string, boolean>>({})
  const [questions, setQuestions] = useState<Record<string, Question[]>>({})
  const [qLoading,  setQLoading]  = useState<Record<string, boolean>>({})
  const [form,      setForm]      = useState<Record<string, QForm>>({})
  const [editId,    setEditId]    = useState<Record<string, string | null>>({})
  const [saving,    setSaving]    = useState<Record<string, boolean>>({})
  const [catForm,   setCatForm]   = useState({ name: '', emoji: '🎯', desc: '' })
  const [catSaving, setCatSaving] = useState(false)
  const [catError,  setCatError]  = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const reloadCats = async () => {
    try {
      const custom = await fetchCustomCategories()
      setAllCats([...BUILT_IN_CATS, ...custom])
    } catch (e) {
      console.error('fetchCustomCategories failed:', e)
    }
  }

  useEffect(() => { if (authed) reloadCats() }, [authed])

  const handleAuth = () => {
    if (password === EDITOR_PASSWORD) { setAuthed(true); setPwError(false) }
    else { setPwError(true) }
  }

  const toggleCat = async (catId: string) => {
    const nowOpen = !open[catId]
    setOpen(o => ({ ...o, [catId]: nowOpen }))
    if (nowOpen && !questions[catId]) {
      setQLoading(l => ({ ...l, [catId]: true }))
      try {
        const qs = await fetchAllQuestions(catId)
        setQuestions(q => ({ ...q, [catId]: qs }))
      } catch { /* ignore */ }
      setQLoading(l => ({ ...l, [catId]: false }))
    }
  }

  const getForm = (catId: string) => form[catId] ?? EMPTY_FORM
  const setF    = (catId: string, patch: Partial<QForm>) =>
    setForm(f => ({ ...f, [catId]: { ...(f[catId] ?? EMPTY_FORM), ...patch } }))

  const startEdit = (catId: string, q: Question) => {
    setForm(f => ({ ...f, [catId]: { q: q.q, a: q.a, difficulty: q.difficulty ?? 'easy', imageUrl: q.imageUrl ?? '' } }))
    setEditId(e => ({ ...e, [catId]: q.id! }))
  }

  const cancelEdit = (catId: string) => {
    setForm(f => ({ ...f, [catId]: EMPTY_FORM }))
    setEditId(e => ({ ...e, [catId]: null }))
  }

  const handleSaveQ = async (catId: string) => {
    const f = getForm(catId)
    if (!f.q.trim() || !f.a.trim()) return
    setSaving(s => ({ ...s, [catId]: true }))
    try {
      const eid = editId[catId]
      if (eid) {
        await updateQuestion(catId, eid, f.q.trim(), f.a.trim(), f.difficulty, f.imageUrl || undefined)
        showToast('✓ تم تحديث السؤال')
      } else {
        await saveQuestion(catId, f.q.trim(), f.a.trim(), f.difficulty, f.imageUrl || undefined)
        showToast('✓ تم حفظ السؤال')
      }
      const qs = await fetchAllQuestions(catId)
      setQuestions(q => ({ ...q, [catId]: qs }))
      setForm(f2 => ({ ...f2, [catId]: EMPTY_FORM }))
      setEditId(e => ({ ...e, [catId]: null }))
    } catch (e: any) {
      showToast(`خطأ: ${e?.message ?? 'فشل الحفظ'}`)
    }
    setSaving(s => ({ ...s, [catId]: false }))
  }

  const handleDeleteQ = async (catId: string, qId: string) => {
    if (!confirm('هل تريد حذف هذا السؤال؟')) return
    await deleteQuestion(catId, qId)
    setQuestions(q => ({ ...q, [catId]: q[catId].filter(x => x.id !== qId) }))
    showToast('تم الحذف')
  }

  const handleSaveCat = async () => {
    if (!catForm.name.trim() || !catForm.emoji.trim()) return
    setCatSaving(true)
    setCatError('')
    try {
      await saveCustomCategory({ name: catForm.name.trim(), emoji: catForm.emoji.trim(), desc: catForm.desc.trim() })
      await reloadCats()
      setCatForm({ name: '', emoji: '🎯', desc: '' })
      showToast('✓ تمت إضافة الفئة')
    } catch (e: any) {
      setCatError(`فشل الحفظ: ${e?.message ?? 'خطأ في Firebase — تحقق من قواعد Firestore'}`)
    }
    setCatSaving(false)
  }

  const handleDeleteCat = async (catId: string) => {
    if (!confirm('حذف هذه الفئة؟')) return
    try {
      await deleteCustomCategory(catId)
      await reloadCats()
      showToast('تم حذف الفئة')
    } catch (e: any) {
      showToast(`خطأ: ${e?.message}`)
    }
  }

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080a10', fontFamily:'Tajawal, sans-serif' }}>
      <div style={{ width:340, background:'#10132a', border:'1px solid #252b55', borderRadius:20, padding:28 }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:'#ffd60a', textAlign:'center', marginBottom:20 }}>🔑 محرر الأسئلة</h1>
        <input type="password" placeholder="كلمة المرور" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key==='Enter' && handleAuth()}
          style={{ ...inp, marginBottom:8, border: pwError ? '1px solid #e63946' : '1px solid #252b55' }}
        />
        {pwError && <p style={{ color:'#e63946', fontSize:12, marginBottom:8, textAlign:'right' }}>كلمة المرور غير صحيحة</p>}
        <button onClick={handleAuth}
          style={{ width:'100%', padding:12, borderRadius:10, background:'#e63946', color:'#fff', fontFamily:'Tajawal, sans-serif', fontSize:15, fontWeight:900, cursor:'pointer', border:'none' }}>
          دخول
        </button>
      </div>
    </div>
  )

  // ── Editor ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#080a10', fontFamily:'Tajawal, sans-serif', color:'#e8eaf6', padding:'16px 20px', maxWidth:880, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:'#ffd60a' }}>✏️ محرر الأسئلة — حزر فزر</h1>
        <a href="/" style={{ fontSize:13, padding:'6px 14px', borderRadius:10, background:'#181c3a', border:'1px solid #252b55', color:'#9099d0', textDecoration:'none' }}>→ الرئيسية</a>
      </div>

      {/* ── Add category ── */}
      <div style={{ background:'#10132a', border:'1px solid #252b55', borderRadius:16, padding:'16px 18px', marginBottom:16 }}>
        <h2 style={{ fontSize:16, fontWeight:900, color:'#e8eaf6', marginBottom:12 }}>➕ إضافة فئة جديدة</h2>
        <div style={{ display:'grid', gridTemplateColumns:'64px 1fr 1fr', gap:10, marginBottom:10 }}>
          <input value={catForm.emoji} onChange={e => setCatForm(f=>({...f, emoji:e.target.value}))}
            placeholder="🎯"
            style={{ ...inp, textAlign:'center', fontSize:22, padding:'8px 6px' }} />
          <input value={catForm.name} onChange={e => setCatForm(f=>({...f, name:e.target.value}))}
            placeholder="اسم الفئة"
            style={inp} />
          <input value={catForm.desc} onChange={e => setCatForm(f=>({...f, desc:e.target.value}))}
            placeholder="وصف قصير (اختياري)"
            style={inp} />
        </div>
        {catError && (
          <div style={{ background:'rgba(230,57,70,.1)', border:'1px solid rgba(230,57,70,.3)', borderRadius:8, padding:'8px 12px', color:'#e63946', fontSize:13, marginBottom:10 }}>
            ⚠ {catError}
          </div>
        )}
        <button onClick={handleSaveCat}
          disabled={catSaving || !catForm.name.trim() || !catForm.emoji.trim()}
          style={{ padding:'9px 22px', borderRadius:8, background: catSaving?'#444':'#e63946', color:'#fff', fontFamily:'Tajawal, sans-serif', fontSize:14, fontWeight:900, cursor: catSaving?'wait':'pointer', border:'none', opacity: !catForm.name.trim()||!catForm.emoji.trim()?0.4:1 }}>
          {catSaving ? 'جاري الحفظ…' : 'حفظ الفئة'}
        </button>
      </div>

      {/* ── Categories accordion ── */}
      {allCats.map(cat => {
        const isOpen  = !!open[cat.id]
        const qs      = questions[cat.id] ?? []
        const isLoad  = qLoading[cat.id]
        const f       = getForm(cat.id)
        const eId     = editId[cat.id] ?? null
        const isSaving = saving[cat.id]

        return (
          <div key={cat.id} style={{ background:'#10132a', border:'1px solid #252b55', borderRadius:14, marginBottom:8, overflow:'hidden' }}>

            {/* Row header */}
            <div onClick={() => toggleCat(cat.id)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:'pointer', userSelect:'none', transition:'background .15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:22 }}>{cat.emoji}</span>
                <span style={{ fontSize:16, fontWeight:700 }}>{cat.name}</span>
                {cat.custom && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'rgba(255,214,10,.1)', border:'1px solid rgba(255,214,10,.3)', color:'#ffd60a' }}>مخصص</span>}
                {isOpen && <span style={{ fontSize:12, color:'#6b74b8' }}>({qs.length} سؤال)</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {cat.custom && (
                  <button onClick={e => { e.stopPropagation(); handleDeleteCat(cat.id) }}
                    style={{ fontSize:11, padding:'3px 10px', borderRadius:8, background:'rgba(230,57,70,.1)', border:'1px solid rgba(230,57,70,.3)', color:'#e63946', cursor:'pointer' }}>
                    حذف الفئة
                  </button>
                )}
                <span style={{ fontSize:18, color:'#6b74b8', display:'inline-block', transform:isOpen?'rotate(180deg)':'none', transition:'transform .2s' }}>▾</span>
              </div>
            </div>

            {/* Expanded body */}
            {isOpen && (
              <div style={{ borderTop:'1px solid #252b55', padding:'14px 16px' }}>

                {/* Add/Edit form */}
                <div style={{ background:'#181c3a', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:900, marginBottom:10, color: eId ? '#ffd60a' : '#9099d0' }}>
                    {eId ? '✏️ تعديل السؤال' : '➕ سؤال جديد'}
                  </div>

                  {/* Question textarea */}
                  <textarea placeholder="نص السؤال بالعربي…" value={f.q}
                    onChange={e => setF(cat.id, { q: e.target.value })}
                    rows={2}
                    style={{ ...inp, resize:'none', marginBottom:8, lineHeight:1.7, border:'1px solid #303870' }} />

                  {/* Answer + difficulty */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, marginBottom:8 }}>
                    <input placeholder="الإجابة الصحيحة…" value={f.a}
                      onChange={e => setF(cat.id, { a: e.target.value })}
                      style={{ ...inp, background:'rgba(255,214,10,.06)', border:'1px solid rgba(255,214,10,.25)', color:'#ffd60a' }} />
                    <select value={f.difficulty}
                      onChange={e => setF(cat.id, { difficulty: e.target.value as Difficulty })}
                      style={{ padding:'9px 12px', borderRadius:8, background:'#252b55', border:'1px solid #303870', color:'#e8eaf6', fontFamily:'Tajawal, sans-serif', fontSize:13, cursor:'pointer', minWidth:110 }}>
                      <option value="easy">سهل — 100 نقطة</option>
                      <option value="medium">متوسط — 300 نقطة</option>
                      <option value="hard">صعب — 500 نقطة</option>
                    </select>
                  </div>

                  {/* Image URL */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, color:'#6b74b8', marginBottom:5 }}>🖼 رابط صورة (اختياري)</div>
                    <input placeholder="https://example.com/image.jpg" value={f.imageUrl}
                      onChange={e => setF(cat.id, { imageUrl: e.target.value })}
                      dir="ltr"
                      style={{ ...inp, textAlign:'left', fontSize:13, color:'#9099d0', border:'1px solid #303870' }} />
                    {f.imageUrl && (
                      <div style={{ marginTop:8, borderRadius:10, overflow:'hidden', maxHeight:180, background:'#252b55' }}>
                        <img src={f.imageUrl} alt="preview"
                          style={{ width:'100%', maxHeight:180, objectFit:'contain', display:'block' }}
                          onError={e => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => handleSaveQ(cat.id)}
                      disabled={isSaving || !f.q.trim() || !f.a.trim()}
                      style={{ padding:'8px 20px', borderRadius:8, background: eId?'#ffd60a':'#e63946', color: eId?'#000':'#fff', fontFamily:'Tajawal, sans-serif', fontSize:14, fontWeight:900, cursor: isSaving?'wait':'pointer', border:'none', opacity: isSaving||!f.q.trim()||!f.a.trim()?0.4:1 }}>
                      {isSaving ? 'جاري…' : eId ? 'حفظ التعديل' : '+ حفظ'}
                    </button>
                    {eId && (
                      <button onClick={() => cancelEdit(cat.id)}
                        style={{ padding:'8px 14px', borderRadius:8, background:'transparent', border:'1px solid #252b55', color:'#6b74b8', fontFamily:'Tajawal, sans-serif', fontSize:13, cursor:'pointer' }}>
                        إلغاء
                      </button>
                    )}
                  </div>
                </div>

                {/* Question list */}
                {isLoad && <div style={{ textAlign:'center', color:'#6b74b8', padding:16 }}>جاري التحميل…</div>}
                {!isLoad && qs.length === 0 && (
                  <div style={{ textAlign:'center', color:'#6b74b8', padding:'12px 0', fontSize:13 }}>
                    لا توجد أسئلة — أضف أول سؤال أعلاه
                  </div>
                )}
                {!isLoad && qs.map((q, i) => (
                  <div key={q.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom: i<qs.length-1?'1px solid #1c2040':'none' }}>
                    <span style={{ fontSize:11, fontWeight:700, minWidth:22, textAlign:'center', padding:'2px 6px', borderRadius:6, background:'#252b55', color:'#6b74b8', flexShrink:0, marginTop:2 }}>{i+1}</span>

                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Question image preview */}
                      {q.imageUrl && (
                        <img src={q.imageUrl} alt=""
                          style={{ width:'100%', maxHeight:120, objectFit:'contain', borderRadius:8, marginBottom:6, background:'#252b55', display:'block' }}
                          onError={e => (e.currentTarget.style.display='none')} />
                      )}
                      <p style={{ fontSize:14, color:'#e8eaf6', marginBottom:5, lineHeight:1.6 }}>{q.q}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, color:'#ffd60a' }}>✓ {q.a}</span>
                        <span style={{ fontSize:11, fontWeight:700, padding:'1px 8px', borderRadius:10,
                          color: DIFFICULTY_COLOR[(q.difficulty??'easy') as keyof typeof DIFFICULTY_COLOR],
                          background: `${DIFFICULTY_COLOR[(q.difficulty??'easy') as keyof typeof DIFFICULTY_COLOR]}22`,
                          border: `1px solid ${DIFFICULTY_COLOR[(q.difficulty??'easy') as keyof typeof DIFFICULTY_COLOR]}` }}>
                          {DIFFICULTY_LABEL[(q.difficulty??'easy') as keyof typeof DIFFICULTY_LABEL]}
                        </span>
                        {q.imageUrl && <span style={{ fontSize:11, color:'#6b74b8' }}>🖼 صورة</span>}
                      </div>
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
                      <button onClick={() => startEdit(cat.id, q)}
                        style={{ fontSize:11, padding:'3px 10px', borderRadius:6, background:'rgba(255,214,10,.1)', border:'1px solid rgba(255,214,10,.3)', color:'#ffd60a', cursor:'pointer' }}>
                        تعديل
                      </button>
                      <button onClick={() => handleDeleteQ(cat.id, q.id!)}
                        style={{ fontSize:11, padding:'3px 10px', borderRadius:6, background:'rgba(230,57,70,.1)', border:'1px solid rgba(230,57,70,.3)', color:'#e63946', cursor:'pointer' }}>
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', padding:'10px 22px', borderRadius:12, background:'#181c3a', border:'1px solid #ffd60a', color:'#ffd60a', fontSize:14, fontWeight:700, zIndex:400, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
