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

type QForm = { q: string; a: string; difficulty: Difficulty }
const EMPTY_FORM: QForm = { q: '', a: '', difficulty: 'easy' }

export default function EditorPage() {
  const [authed,   setAuthed]   = useState(false)
  const [password, setPassword] = useState('')
  const [toast,    setToast]    = useState('')
  const [allCats,  setAllCats]  = useState<Category[]>([...BUILT_IN_CATS])

  // Per-category: open state, questions list, form state
  const [open,     setOpen]     = useState<Record<string, boolean>>({})
  const [questions, setQuestions] = useState<Record<string, Question[]>>({})
  const [loading,  setLoading]  = useState<Record<string, boolean>>({})
  const [form,     setForm]     = useState<Record<string, QForm>>({})
  const [editId,   setEditId]   = useState<Record<string, string | null>>({})

  // New category form
  const [catForm,  setCatForm]  = useState({ name: '', emoji: '', desc: '' })
  const [catSaving, setCatSaving] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadCustomCats = async () => {
    const custom = await fetchCustomCategories()
    setAllCats([...BUILT_IN_CATS, ...custom])
  }

  useEffect(() => { if (authed) loadCustomCats() }, [authed])

  const toggleCat = async (catId: string) => {
    const nowOpen = !open[catId]
    setOpen(o => ({ ...o, [catId]: nowOpen }))
    if (nowOpen && !questions[catId]) {
      setLoading(l => ({ ...l, [catId]: true }))
      const qs = await fetchAllQuestions(catId)
      setQuestions(q => ({ ...q, [catId]: qs }))
      setLoading(l => ({ ...l, [catId]: false }))
    }
  }

  const startEdit = (catId: string, q: Question) => {
    setForm(f => ({ ...f, [catId]: { q: q.q, a: q.a, difficulty: q.difficulty ?? 'easy' } }))
    setEditId(e => ({ ...e, [catId]: q.id! }))
  }

  const cancelEdit = (catId: string) => {
    setForm(f => ({ ...f, [catId]: EMPTY_FORM }))
    setEditId(e => ({ ...e, [catId]: null }))
  }

  const handleSave = async (catId: string) => {
    const f = form[catId] ?? EMPTY_FORM
    if (!f.q.trim() || !f.a.trim()) return
    const eid = editId[catId]
    if (eid) {
      await updateQuestion(catId, eid, f.q.trim(), f.a.trim(), f.difficulty)
      showToast('✓ تم تحديث السؤال')
    } else {
      await saveQuestion(catId, f.q.trim(), f.a.trim(), f.difficulty)
      showToast('✓ تم حفظ السؤال')
    }
    const qs = await fetchAllQuestions(catId)
    setQuestions(q => ({ ...q, [catId]: qs }))
    setForm(f2 => ({ ...f2, [catId]: EMPTY_FORM }))
    setEditId(e => ({ ...e, [catId]: null }))
  }

  const handleDelete = async (catId: string, qId: string) => {
    if (!confirm('هل تريد حذف هذا السؤال؟')) return
    await deleteQuestion(catId, qId)
    setQuestions(q => ({ ...q, [catId]: q[catId].filter(x => x.id !== qId) }))
    showToast('تم الحذف')
  }

  const handleSaveCat = async () => {
    if (!catForm.name.trim() || !catForm.emoji.trim()) return
    setCatSaving(true)
    await saveCustomCategory({ name: catForm.name.trim(), emoji: catForm.emoji.trim(), desc: catForm.desc.trim() })
    await loadCustomCats()
    setCatForm({ name: '', emoji: '', desc: '' })
    setCatSaving(false)
    showToast('✓ تمت إضافة الفئة')
  }

  const handleDeleteCat = async (catId: string) => {
    if (!confirm('حذف هذه الفئة وجميع أسئلتها؟')) return
    await deleteCustomCategory(catId)
    await loadCustomCats()
    showToast('تم حذف الفئة')
  }

  // ── Auth gate ──
  if (!authed) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080a10', fontFamily:'Tajawal, sans-serif' }}>
      <div style={{ width:340, background:'#10132a', border:'1px solid #252b55', borderRadius:20, padding:28 }}>
        <h1 style={{ fontSize:20, fontWeight:900, color:'#ffd60a', textAlign:'center', marginBottom:20 }}>🔑 محرر الأسئلة</h1>
        <input type="password" placeholder="كلمة المرور" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key==='Enter' && (password===EDITOR_PASSWORD?setAuthed(true):showToast('كلمة المرور غير صحيحة'))}
          style={{ width:'100%', padding:'10px 14px', borderRadius:10, background:'#181c3a', border:'1px solid #252b55', color:'#e8eaf6', fontFamily:'Tajawal, sans-serif', fontSize:15, marginBottom:12, textAlign:'right', boxSizing:'border-box' }}
        />
        <button onClick={() => password===EDITOR_PASSWORD?setAuthed(true):showToast('كلمة المرور غير صحيحة')}
          style={{ width:'100%', padding:'11px', borderRadius:10, background:'#e63946', color:'#fff', fontFamily:'Tajawal, sans-serif', fontSize:15, fontWeight:900, cursor:'pointer', border:'none' }}>
          دخول
        </button>
        {toast && <p style={{ textAlign:'center', color:'#e63946', marginTop:10, fontSize:13 }}>{toast}</p>}
      </div>
    </div>
  )

  const s = (obj: React.CSSProperties) => obj

  return (
    <div style={{ minHeight:'100vh', background:'#080a10', fontFamily:'Tajawal, sans-serif', color:'#e8eaf6', padding:'16px 20px', maxWidth:860, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:'#ffd60a' }}>✏️ محرر الأسئلة — حزر فزر</h1>
        <a href="/" style={{ fontSize:13, padding:'5px 14px', borderRadius:10, background:'#181c3a', border:'1px solid #252b55', color:'#9099d0', textDecoration:'none' }}>→ الرئيسية</a>
      </div>

      {/* Add category */}
      <div style={{ background:'#10132a', border:'1px solid #252b55', borderRadius:16, padding:'16px 18px', marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:900, color:'#e8eaf6', marginBottom:12 }}>➕ إضافة فئة جديدة</h2>
        <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 1fr', gap:10, marginBottom:10 }}>
          <input placeholder="🎯" value={catForm.emoji} onChange={e => setCatForm(f=>({...f,emoji:e.target.value}))}
            style={s({ padding:'8px 10px', borderRadius:8, background:'#181c3a', border:'1px solid #252b55', color:'#e8eaf6', fontFamily:'Tajawal, sans-serif', fontSize:20, textAlign:'center', boxSizing:'border-box' })} />
          <input placeholder="اسم الفئة" value={catForm.name} onChange={e => setCatForm(f=>({...f,name:e.target.value}))}
            style={s({ padding:'8px 12px', borderRadius:8, background:'#181c3a', border:'1px solid #252b55', color:'#e8eaf6', fontFamily:'Tajawal, sans-serif', fontSize:14, textAlign:'right', boxSizing:'border-box' })} />
          <input placeholder="وصف قصير" value={catForm.desc} onChange={e => setCatForm(f=>({...f,desc:e.target.value}))}
            style={s({ padding:'8px 12px', borderRadius:8, background:'#181c3a', border:'1px solid #252b55', color:'#e8eaf6', fontFamily:'Tajawal, sans-serif', fontSize:14, textAlign:'right', boxSizing:'border-box' })} />
        </div>
        <button onClick={handleSaveCat} disabled={catSaving || !catForm.name.trim() || !catForm.emoji.trim()}
          style={{ padding:'8px 20px', borderRadius:8, background:'#e63946', color:'#fff', fontFamily:'Tajawal, sans-serif', fontSize:13, fontWeight:900, cursor:'pointer', border:'none', opacity:catSaving||!catForm.name.trim()||!catForm.emoji.trim()?0.4:1 }}>
          {catSaving ? 'جاري الحفظ…' : 'حفظ الفئة'}
        </button>
      </div>

      {/* All categories accordion */}
      {allCats.map(cat => {
        const isOpen    = !!open[cat.id]
        const qs        = questions[cat.id] ?? []
        const isLoading = loading[cat.id]
        const f         = form[cat.id] ?? EMPTY_FORM
        const eId       = editId[cat.id] ?? null

        return (
          <div key={cat.id} style={{ background:'#10132a', border:'1px solid #252b55', borderRadius:14, marginBottom:8, overflow:'hidden' }}>

            {/* Category row */}
            <div onClick={() => toggleCat(cat.id)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:'pointer', userSelect:'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:22 }}>{cat.emoji}</span>
                <span style={{ fontSize:16, fontWeight:700, color:'#e8eaf6' }}>{cat.name}</span>
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
                <span style={{ fontSize:18, color:'#6b74b8', transform:isOpen?'rotate(180deg)':'none', transition:'transform .2s' }}>▾</span>
              </div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ borderTop:'1px solid #252b55', padding:'14px 16px' }}>

                {/* Add / Edit form */}
                <div style={{ background:'#181c3a', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color: eId ? '#ffd60a' : '#e8eaf6', marginBottom:10 }}>
                    {eId ? '✏️ تعديل السؤال' : '➕ إضافة سؤال جديد'}
                  </div>
                  <textarea placeholder="نص السؤال…" value={f.q}
                    onChange={e => setForm(prev => ({ ...prev, [cat.id]: { ...(prev[cat.id]??EMPTY_FORM), q:e.target.value } }))}
                    rows={2}
                    style={{ width:'100%', padding:'8px 12px', borderRadius:8, background:'#252b55', border:'1px solid #303870', color:'#e8eaf6', fontFamily:'Tajawal, sans-serif', fontSize:14, textAlign:'right', resize:'none', marginBottom:8, boxSizing:'border-box' }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, marginBottom:8 }}>
                    <input placeholder="الإجابة الصحيحة…" value={f.a}
                      onChange={e => setForm(prev => ({ ...prev, [cat.id]: { ...(prev[cat.id]??EMPTY_FORM), a:e.target.value } }))}
                      style={{ padding:'8px 12px', borderRadius:8, background:'rgba(255,214,10,.06)', border:'1px solid rgba(255,214,10,.3)', color:'#ffd60a', fontFamily:'Tajawal, sans-serif', fontSize:14, textAlign:'right', boxSizing:'border-box' }} />
                    <select value={f.difficulty}
                      onChange={e => setForm(prev => ({ ...prev, [cat.id]: { ...(prev[cat.id]??EMPTY_FORM), difficulty:e.target.value as Difficulty } }))}
                      style={{ padding:'8px 12px', borderRadius:8, background:'#252b55', border:'1px solid #303870', color:'#e8eaf6', fontFamily:'Tajawal, sans-serif', fontSize:14, cursor:'pointer', minWidth:100 }}>
                      <option value="easy">سهل — 100</option>
                      <option value="medium">متوسط — 300</option>
                      <option value="hard">صعب — 500</option>
                    </select>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => handleSave(cat.id)} disabled={!f.q.trim()||!f.a.trim()}
                      style={{ padding:'7px 18px', borderRadius:8, background:eId?'#ffd60a':'#e63946', color:eId?'#000':'#fff', fontFamily:'Tajawal, sans-serif', fontSize:13, fontWeight:900, cursor:'pointer', border:'none', opacity:!f.q.trim()||!f.a.trim()?0.4:1 }}>
                      {eId ? 'حفظ التعديل' : '+ حفظ'}
                    </button>
                    {eId && (
                      <button onClick={() => cancelEdit(cat.id)}
                        style={{ padding:'7px 14px', borderRadius:8, background:'transparent', border:'1px solid #252b55', color:'#6b74b8', fontFamily:'Tajawal, sans-serif', fontSize:13, cursor:'pointer' }}>
                        إلغاء
                      </button>
                    )}
                  </div>
                </div>

                {/* Question list */}
                {isLoading && <div style={{ textAlign:'center', color:'#6b74b8', padding:16 }}>جاري التحميل…</div>}
                {!isLoading && qs.length === 0 && (
                  <div style={{ textAlign:'center', color:'#6b74b8', padding:16, fontSize:13 }}>لا توجد أسئلة — أضف أول سؤال أعلاه</div>
                )}
                {!isLoading && qs.map((q, i) => (
                  <div key={q.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom: i < qs.length-1 ? '1px solid #181c3a' : 'none' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:6, background:'#181c3a', color:'#6b74b8', flexShrink:0, marginTop:2 }}>{i+1}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, color:'#e8eaf6', marginBottom:4, lineHeight:1.6 }}>{q.q}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, color:'#ffd60a' }}>✓ {q.a}</span>
                        <span style={{ fontSize:11, fontWeight:700, padding:'1px 8px', borderRadius:10,
                          color: DIFFICULTY_COLOR[(q.difficulty??'easy') as keyof typeof DIFFICULTY_COLOR],
                          background: `${DIFFICULTY_COLOR[(q.difficulty??'easy') as keyof typeof DIFFICULTY_COLOR]}22`,
                          border: `1px solid ${DIFFICULTY_COLOR[(q.difficulty??'easy') as keyof typeof DIFFICULTY_COLOR]}` }}>
                          {DIFFICULTY_LABEL[(q.difficulty??'easy') as keyof typeof DIFFICULTY_LABEL]}
                        </span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={() => startEdit(cat.id, q)}
                        style={{ fontSize:11, padding:'3px 10px', borderRadius:6, background:'rgba(255,214,10,.1)', border:'1px solid rgba(255,214,10,.3)', color:'#ffd60a', cursor:'pointer' }}>
                        تعديل
                      </button>
                      <button onClick={() => handleDelete(cat.id, q.id!)}
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
