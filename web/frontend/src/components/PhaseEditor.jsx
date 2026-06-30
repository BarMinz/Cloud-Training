import { useState, useRef } from 'react'
import { api } from '../api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'
import { Save, X, Plus, Trash2, ChevronUp, ChevronDown, Loader2, Upload, Eye, Edit2, History, Undo2 } from 'lucide-react'

const COLOR_PRESETS = [
  { name: 'Sky',     gradient: 'from-sky-500 to-blue-600' },
  { name: 'Cyan',    gradient: 'from-cyan-500 to-sky-600' },
  { name: 'Emerald', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'Yellow',  gradient: 'from-yellow-500 to-orange-500' },
  { name: 'Orange',  gradient: 'from-orange-500 to-amber-600' },
  { name: 'Red',     gradient: 'from-red-500 to-rose-600' },
  { name: 'Pink',    gradient: 'from-fuchsia-500 to-pink-600' },
  { name: 'Violet',  gradient: 'from-violet-500 to-purple-600' },
  { name: 'Blue',    gradient: 'from-blue-500 to-indigo-600' },
  { name: 'Slate',   gradient: 'from-slate-500 to-zinc-600' },
]
const COMMON_ICONS = ['🎫','🌐','🐧','🪟','🛡️','🐳','📡','💾','☁️','⚙️','🔒','📊','🧪','📦','🚀','🎯','💡','🔧','📁','📨']

function extractImageUrls(md) {
  const out = []
  const re = /!\[[^\]]*\]\((\/uploads\/phases\/\d+\/[^)\s]+)\)/g
  let m
  while ((m = re.exec(md)) !== null) out.push(m[1])
  return out
}

function MarkdownField({ value, onChange, phaseId }) {
  const [tab, setTab] = useState('edit')
  const [uploading, setUploading] = useState(false)
  const [upErr, setUpErr] = useState('')
  const taRef = useRef(null)
  const fileRef = useRef(null)

  const upload = async (file) => {
    setUploading(true); setUpErr('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const t = localStorage.getItem('token')
      const res = await fetch(`/api/phases/${phaseId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      const ta = taRef.current
      const start = ta?.selectionStart ?? value.length
      const end = ta?.selectionEnd ?? value.length
      const insert = `![](${data.url})`
      const next = value.slice(0, start) + insert + value.slice(end)
      onChange(next)
      setTimeout(() => {
        if (ta) { ta.focus(); ta.setSelectionRange(start + insert.length, start + insert.length) }
      }, 0)
    } catch (e) {
      setUpErr(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex gap-1 bg-white/5 rounded-md p-0.5 border border-white/10">
          <button type="button" onClick={() => setTab('edit')} className={`px-3 py-1 text-xs rounded inline-flex items-center gap-1 ${tab === 'edit' ? 'bg-brand-500/30 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <button type="button" onClick={() => setTab('preview')} className={`px-3 py-1 text-xs rounded inline-flex items-center gap-1 ${tab === 'preview' ? 'bg-brand-500/30 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Eye className="w-3 h-3" /> Preview
          </button>
        </div>
        {tab === 'edit' && (
          <>
            <input type="file" ref={fileRef} accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 text-xs text-brand-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md border border-white/10">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
          </>
        )}
      </div>
      {tab === 'edit' ? (
        <textarea ref={taRef} value={value} onChange={(e) => onChange(e.target.value)} rows={14} className="input w-full resize-y font-mono text-sm leading-relaxed" placeholder="Write Markdown… **bold**, `code`, tables, lists, etc. Click Upload image to insert a screenshot." />
      ) : (
        <div className="md-preview min-h-[14rem] p-4 rounded-lg bg-surface-2/60 border border-white/5 overflow-x-auto text-sm">
          {value.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown> : <p className="text-slate-500 italic">Nothing to preview yet.</p>}
        </div>
      )}
      {upErr && <p className="text-xs text-rose-400 mt-1">{upErr}</p>}
      <p className="text-xs text-slate-500 mt-1">GitHub-flavored Markdown: <code className="text-amber-300">**bold**</code>, <code className="text-amber-300">`code`</code>, tables, task lists, autolinks. Images: <code className="text-amber-300">![alt](url)</code>.</p>
    </div>
  )
}

function ListEditor({ label, items, onChange, placeholder, isObjectLabel }) {
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const update = (i, val) => {
    const next = [...items]
    if (isObjectLabel) next[i] = { ...next[i], label: val }
    else next[i] = val
    onChange(next)
  }
  const remove = (i) => onChange(items.filter((_, k) => k !== i))
  const add = () => onChange([...items, isObjectLabel ? { id: '', label: '' } : ''])
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{label}</h3>
        <button onClick={add} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      {items.length === 0 && <p className="text-xs text-slate-500 italic">No items yet</p>}
      {items.map((it, i) => {
        const val = isObjectLabel ? (it?.label || '') : it
        return (
          <div key={i} className="flex items-start gap-2">
            <div className="flex flex-col gap-0.5 pt-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-500 hover:text-slate-300 disabled:opacity-30">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-slate-500 hover:text-slate-300 disabled:opacity-30">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea value={val} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} rows={2} className="input flex-1 text-sm resize-y" />
            <button onClick={() => remove(i)} className="text-rose-400 hover:text-rose-300 pt-1.5">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function PhaseEditor({ phase, onSaved, onCancel }) {
  const [title, setTitle] = useState(phase.title || '')
  const [subtitle, setSubtitle] = useState(phase.subtitle || '')
  const [description, setDescription] = useState(phase.description || '')
  const [objectives, setObjectives] = useState(phase.objectives || [])
  const [tasks, setTasks] = useState(phase.tasks || [])
  const [tips, setTips] = useState(phase.tips || [])
  const [icon, setIcon] = useState(phase.icon || '')
  const [difficulty, setDifficulty] = useState(phase.difficulty || 'Beginner')
  const [estimatedTime, setEstimatedTime] = useState(phase.estimatedTime || '')
  const [color, setColor] = useState(phase.color || COLOR_PRESETS[0].gradient)
  const [accent, setAccent] = useState(phase.accent || '#38bdf8')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [revisions, setRevisions] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [reverting, setReverting] = useState(0)
  const originalImagesRef = useRef(extractImageUrls(phase.description || ''))
  const openHistory = async () => {
    setHistoryOpen(true); setLoadingHist(true)
    try {
      const rows = await api.get(`/phases/${phase.id}/revisions`)
      setRevisions(rows || [])
    } catch { setRevisions([]) }
    finally { setLoadingHist(false) }
  }
  const revertTo = async (rev) => {
    const when = rev.created_at ? new Date(rev.created_at).toLocaleString() : ''
    if (!confirm(`Revert to revision #${rev.id} (${when})? The current state will be saved as a new revision first.`)) return
    setReverting(rev.id)
    try {
      const updated = await api.post(`/phases/${phase.id}/revisions/${rev.id}/revert`)
      setHistoryOpen(false)
      onSaved(updated)
    } catch (e) {
      alert(e.message || 'Revert failed')
    } finally {
      setReverting(0)
    }
  }
  const save = async () => {
    setSaving(true); setError('')
    try {
      const updated = await api.put(`/phases/${phase.id}`, { title, subtitle, description, objectives, tasks, tips, icon, difficulty, estimatedTime, color, accent })
      // Clean up image files that were removed from the description
      const newUrls = new Set(extractImageUrls(description))
      const removed = (originalImagesRef.current || []).filter((u) => !newUrls.has(u))
      for (const url of removed) {
        const m = url.match(/^\/uploads\/phases\/(\d+)\/([^/]+)$/)
        if (m && parseInt(m[1]) === phase.id) {
          try { await api.delete(`/phases/${phase.id}/uploads/${m[2]}`) } catch {}
        }
      }
      originalImagesRef.current = extractImageUrls(description)
      onSaved(updated)
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Subtitle</label>
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Description</label>
          <MarkdownField value={description} onChange={setDescription} phaseId={phase.id} />
        </div>
      </div>
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">Appearance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Icon</label>
            <div className="flex items-center gap-2">
              <input value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} className="input w-20 text-center text-2xl" placeholder="🎯" />
              <span className="text-xs text-slate-500">One emoji</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {COMMON_ICONS.map((e) => (
                <button type="button" key={e} onClick={() => setIcon(e)} className={clsx('text-lg w-8 h-8 rounded border transition', icon === e ? 'bg-brand-500/30 border-brand-400' : 'bg-white/5 border-white/10 hover:bg-white/10')}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input w-full">
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">Estimated time</label>
            <input value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} placeholder="2–3 hours" className="input w-full" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-2">Color theme</label>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {COLOR_PRESETS.map((c) => (
              <button type="button" key={c.gradient} onClick={() => setColor(c.gradient)} title={c.name} className={clsx('h-10 rounded-lg bg-gradient-to-br ring-2 transition', c.gradient, color === c.gradient ? 'ring-white scale-105' : 'ring-transparent hover:ring-white/30')} />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-2">Accent color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 rounded cursor-pointer bg-transparent border border-white/10" />
            <input value={accent} onChange={(e) => setAccent(e.target.value)} placeholder="#38bdf8" className="input w-32 font-mono text-xs" />
            <span className="text-xs text-slate-500">Hex preview:</span>
            <span className="inline-block w-6 h-6 rounded border border-white/10" style={{ background: accent }} />
          </div>
        </div>
      </div>
      <div className="card p-5"><ListEditor label="Objectives" items={objectives} onChange={setObjectives} placeholder="Add a learning objective…" /></div>
      <div className="card p-5"><ListEditor label="Tasks" items={tasks} onChange={setTasks} placeholder="Add a task…" isObjectLabel /></div>
      <div className="card p-5"><ListEditor label="Tips" items={tips} onChange={setTips} placeholder="Add a tip…" /></div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex items-center justify-between gap-3 sticky bottom-4 bg-surface-1/95 backdrop-blur px-4 py-3 rounded-xl border border-white/10">
        <button type="button" onClick={openHistory} className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md border border-white/10"><History className="w-3.5 h-3.5" /> History</button>
        <div className="flex items-center gap-3">
        <button onClick={onCancel} className="btn-secondary inline-flex items-center"><X className="w-4 h-4 mr-1" /> Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary inline-flex items-center">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save</button>
        </div>
      </div>
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setHistoryOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-md bg-surface-1 border-l border-white/10 h-full overflow-y-auto p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white inline-flex items-center gap-2"><History className="w-4 h-4 text-brand-400" /> Revision history</h3>
              <button onClick={() => setHistoryOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            {loadingHist ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : revisions.length === 0 ? (
              <p className="text-sm text-slate-500">No revisions yet — Save a change to create one. Up to 20 are kept per phase.</p>
            ) : (
              <div className="space-y-2">
                {revisions.map((r) => (
                  <div key={r.id} className="card p-3">
                    <p className="text-xs text-slate-500">#{r.id} · <span className="text-slate-300">{r.author_username || 'unknown'}</span></p>
                    <p className="text-sm text-slate-200 mt-1 truncate">{r.title || '(no title)'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</p>
                    <button onClick={() => revertTo(r)} disabled={reverting === r.id} className="mt-2 text-xs inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded border border-amber-500/30 disabled:opacity-50">
                      {reverting === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                      Revert to this
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
