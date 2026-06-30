import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { DIFFICULTY_COLORS, STATUS_META } from '../data/phases'
import { usePhases } from '../contexts/PhasesContext'
import { useAuth } from '../contexts/AuthContext'
import PhaseEditor from '../components/PhaseEditor'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, CheckCircle2, Circle, Clock, Target, Lightbulb,
  ChevronRight, Loader2, Save, MonitorPlay, Lock, MessageSquare, Edit3
} from 'lucide-react'
import clsx from 'clsx'

export default function PhaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const phaseId = parseInt(id)
  const { phases: PHASES, loading: phasesLoading, refresh: refreshPhases } = usePhases()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const isAdmin = user?.role === 'admin' || user?.role === 'main_admin'
  const phase = PHASES.find((p) => p.id === phaseId)

  const [progress, setProgress] = useState(null)
  const [prevProgress, setPrevProgress] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!phase) return
    api.get('/progress/')
      .then((all) => {
        const p = all.find((x) => x.phase_id === phaseId)
        const prev = phaseId > 1 ? all.find((x) => x.phase_id === phaseId - 1) : null
        setProgress(p)
        setPrevProgress(prev)
        setNotes(p?.notes || '')
      })
      .catch(console.error)
  }, [phaseId])

  if (!phase) {
    if (phasesLoading) return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-400">Phase not found.</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    )
  }

  const status = progress?.status || 'not_started'
  const prevFailed = prevProgress?.grade === 'not_passed'
  const isLocked = !isAdmin && phaseId > 1 && (prevProgress?.status !== 'completed' || prevFailed)
  const needsRevision = status === 'in_progress' && progress?.grade === 'not_passed'
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

  if (editing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
        <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to read view
        </button>
        <h1 className="text-lg font-semibold text-white mb-4">Editing Phase {phase.id}</h1>
        <PhaseEditor
          phase={phase}
          onSaved={async () => { await refreshPhases(); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        {isAdmin && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md border border-white/10 transition-colors">
            <Edit3 className="w-3.5 h-3.5" /> Edit phase
          </button>
        )}
      </div>

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

        <div className="md-preview mt-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{phase.description || ''}</ReactMarkdown>
        </div>

        {/* Phase 1 simulation launcher */}
        {phaseId === 1 && status !== 'not_started' && (
          <div className="mt-5 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-sky-300">Interactive Simulation</p>
              <p className="text-xs text-slate-400 mt-0.5">Practice with a live Kayako-style support queue — 4 tickets, real customer conversations.</p>
              <p className="text-xs text-slate-500 mt-1.5">Type <code className="bg-white/8 border border-white/10 rounded px-1 py-0.5 text-amber-300 not-italic">/hint</code> in the reply box at any time for a contextual hint.</p>
            </div>
            <Link to="/phase/1/simulation" className="shrink-0 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
              <MonitorPlay className="w-4 h-4" /> Launch
            </Link>
          </div>
        )}

        {/* Phase 2 LAMP lab launcher — hidden once phase is submitted */}
        {phaseId === 2 && status === 'in_progress' && (
          <div className="mt-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-300">Interactive LAMP Lab</p>
              <p className="text-xs text-slate-400 mt-0.5">A fresh Ubuntu 24.04 container is provisioned just for you — build your LAMP stack directly in the browser.</p>
            </div>
            <Link to="/phase/2/lab" className="shrink-0 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
              <MonitorPlay className="w-4 h-4" /> Open Terminal
            </Link>
          </div>
        )}

        {/* Status actions */}
        <div className="flex gap-2 mt-5 flex-wrap items-center">
          {isLocked ? (
            <div className={clsx(
              'flex items-center gap-2 text-sm rounded-lg px-4 py-2.5',
              prevFailed
                ? 'text-red-600 bg-red-500/10 border border-red-500/20'
                : 'text-slate-500 bg-slate-500/10 border border-slate-500/20'
            )}>
              <Lock className="w-4 h-4" />
              {prevFailed
                ? `Phase ${phaseId - 1} requires revision — check the admin feedback there first`
                : `Complete Phase ${phaseId - 1} to unlock this phase`}
            </div>
          ) : (
            <>
              {status === 'not_started' && (
                <button onClick={() => updateStatus('in_progress')} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                  Start Phase
                </button>
              )}
              {status === 'in_progress' && (
                <div className="flex flex-col gap-2">
                  {needsRevision && (
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      Address the admin feedback below before resubmitting
                    </p>
                  )}
                  <button onClick={() => updateStatus('completed')} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {needsRevision ? 'Resubmit for Review' : 'Mark Complete'}
                  </button>
                </div>
              )}
              {status === 'completed' && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Phase completed — contact an admin to reset
                </p>
              )}
            </>
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

          {/* Admin review */}
          {progress?.grade && (
            <div className={clsx(
              'card p-5 border',
              progress.grade === 'passed'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-red-500/30 bg-red-500/5'
            )}>
              <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                <MessageSquare className={clsx('w-4 h-4', progress.grade === 'passed' ? 'text-emerald-400' : 'text-red-400')} />
                Admin Review
              </h2>
              <p className={clsx(
                'text-sm font-semibold mb-2',
                progress.grade === 'passed' ? 'text-emerald-400' : 'text-red-400'
              )}>
                {progress.grade === 'passed' ? '✓ Passed' : '✗ Not Passed'}
              </p>
              {progress.feedback && (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {progress.feedback}
                </p>
              )}
              {progress.reviewed_at && (
                <p className="text-xs text-slate-600 mt-2">
                  {new Date(progress.reviewed_at).toLocaleDateString()}
                </p>
              )}
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
