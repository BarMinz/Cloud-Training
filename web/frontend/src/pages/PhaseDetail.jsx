import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { PHASES, DIFFICULTY_COLORS, STATUS_META } from '../data/phases'
import {
  ArrowLeft, CheckCircle2, Circle, Clock, Target, Lightbulb,
  ChevronRight, Loader2, Save
} from 'lucide-react'
import clsx from 'clsx'

export default function PhaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const phaseId = parseInt(id)
  const phase = PHASES.find((p) => p.id === phaseId)

  const [progress, setProgress] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!phase) return
    api.get('/progress/')
      .then((all) => {
        const p = all.find((x) => x.phase_id === phaseId)
        setProgress(p)
        setNotes(p?.notes || '')
      })
      .catch(console.error)
  }, [phaseId])

  if (!phase) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-slate-400">Phase not found.</p>
      <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
    </div>
  )

  const status = progress?.status || 'not_started'
  const sm = STATUS_META[status]
  const dc = DIFFICULTY_COLORS[phase.difficulty]

  const updateStatus = async (newStatus) => {
    setSaving(true)
    try {
      const updated = await api.put(`/progress/${phaseId}`, { status: newStatus, notes })
      setProgress(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    setSaving(true)
    try {
      const updated = await api.put(`/progress/${phaseId}`, { status, notes })
      setProgress(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const prev = PHASES.find((p) => p.id === phaseId - 1)
  const next = PHASES.find((p) => p.id === phaseId + 1)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="card p-6 mb-6 relative overflow-hidden">
        <div className={clsx('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', phase.color)} />

        <div className="flex items-start gap-5">
          <div className={clsx('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl shrink-0 shadow-xl', phase.color)}>
            {phase.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-slate-500">Phase {phase.id}</span>
              <span className={clsx('badge border', dc.bg, dc.text, dc.border)}>{phase.difficulty}</span>
              <span className={clsx('badge border', sm.bg, sm.color, sm.border)}>{sm.label}</span>
            </div>
            <h1 className="text-xl font-bold text-white">{phase.title}</h1>
            <p className="text-slate-400 text-sm">{phase.subtitle}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 shrink-0">
            <Clock className="w-3.5 h-3.5" />
            {phase.estimatedTime}
          </div>
        </div>

        <p className="mt-4 text-slate-300 leading-relaxed">{phase.description}</p>

        {/* Status actions */}
        <div className="flex gap-2 mt-5 flex-wrap">
          {status === 'not_started' && (
            <button onClick={() => updateStatus('in_progress')} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              Start Phase
            </button>
          )}
          {status === 'in_progress' && (
            <>
              <button onClick={() => updateStatus('completed')} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark Complete
              </button>
              <button onClick={() => updateStatus('not_started')} className="btn-ghost text-sm">Reset</button>
            </>
          )}
          {status === 'completed' && (
            <button onClick={() => updateStatus('in_progress')} className="btn-ghost flex items-center gap-2 text-sm">
              <Circle className="w-4 h-4" /> Reopen Phase
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Tasks & Objectives */}
        <div className="md:col-span-2 space-y-6">
          {/* Objectives */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-400" /> Learning Objectives
            </h2>
            <ul className="space-y-2">
              {phase.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <ChevronRight className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Tasks */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tasks Checklist
            </h2>
            <ul className="space-y-3">
              {phase.tasks.map((task, i) => (
                <li key={task.id} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-surface-3 border border-white/10 text-xs flex items-center justify-center text-slate-500 shrink-0 mt-0.5 font-mono">
                    {i + 1}
                  </span>
                  {task.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-200 mb-3">Your Notes</h2>
            <textarea
              className="input min-h-[120px] resize-y font-mono text-sm"
              placeholder="Document your steps, commands used, issues encountered…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex justify-end mt-3">
              <button onClick={saveNotes} disabled={saving} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tips */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" /> Tips
            </h2>
            <ul className="space-y-3">
              {phase.tips.map((tip, i) => (
                <li key={i} className="text-sm text-slate-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2.5 leading-snug">
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Timestamps */}
          {progress?.started_at && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-200 mb-3 text-sm">Timeline</h2>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Started</span>
                  <span className="text-slate-300">{new Date(progress.started_at).toLocaleDateString()}</span>
                </div>
                {progress.completed_at && (
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="text-emerald-400">{new Date(progress.completed_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prev / Next */}
          <div className="flex flex-col gap-2">
            {prev && (
              <Link to={`/phase/${prev.id}`} className="card p-3 flex items-center gap-3 hover:border-white/20 transition-all">
                <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Previous</p>
                  <p className="text-sm text-slate-300 truncate">{prev.title}</p>
                </div>
              </Link>
            )}
            {next && (
              <Link to={`/phase/${next.id}`} className="card p-3 flex items-center gap-3 hover:border-white/20 transition-all">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Next</p>
                  <p className="text-sm text-slate-300 truncate">{next.title}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
