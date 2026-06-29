import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import PhaseCard from '../components/PhaseCard'
import ProgressRing from '../components/ProgressRing'
import { PHASES } from '../data/phases'
import { CheckCircle2, Loader2, Zap, Trophy, BookOpen, AlertTriangle } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/progress/')
      .then(setProgress)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const getProgress = (phaseId) => progress.find((p) => p.phase_id === phaseId)

  const isLocked = (phaseId) => {
    if (phaseId === 1) return false
    const prev = getProgress(phaseId - 1)
    return prev?.status !== 'completed' || prev?.grade === 'not_passed'
  }

  const needsRevision = progress.filter((p) => p.grade === 'not_passed')

  const completed   = progress.filter((p) => p.status === 'completed').length
  const inProgress  = progress.filter((p) => p.status === 'in_progress').length
  const notStarted  = PHASES.length - completed - inProgress

  const pct = Math.round((completed / PHASES.length) * 100)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, <span className="text-gradient">{user?.username}</span> 👋
        </h1>
        <p className="text-slate-400">Track your progress through the 10-phase cloud training program.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Progress ring */}
        <div className="card p-5 col-span-2 md:col-span-1 flex items-center gap-4">
          <div className="relative shrink-0">
            <ProgressRing value={completed} max={PHASES.length} size={72} stroke={6} />
            <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-white">{pct}%</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Overall</p>
            <p className="text-lg font-bold text-white mt-0.5">{completed}/{PHASES.length}</p>
            <p className="text-xs text-slate-400">phases done</p>
          </div>
        </div>

        {[
          { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Completed', value: completed },
          { icon: Zap,          color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'In Progress', value: inProgress },
          { icon: BookOpen,     color: 'text-slate-400',   bg: 'bg-slate-500/10',   label: 'Not Started', value: notStarted },
        ].map(({ icon: Icon, color, bg, label, value }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
              <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revision required banner */}
      {needsRevision.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">
              {needsRevision.length === 1 ? '1 phase needs revision' : `${needsRevision.length} phases need revision`}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {needsRevision.map((p) => {
                const phase = PHASES.find((ph) => ph.id === p.phase_id)
                return (
                  <a key={p.phase_id} href={`/phase/${p.phase_id}`} className="underline hover:text-slate-200 transition-colors mr-3">
                    Phase {p.phase_id}: {phase?.title}
                  </a>
                )
              })}
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Training Progress</span>
          <span>{pct}% complete</span>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Phase grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Training Phases</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PHASES.map((phase, i) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              progress={getProgress(phase.id)}
              locked={isLocked(phase.id)}
              index={i}
            />
          ))}
        </div>
      </div>

      {completed === PHASES.length && (
        <div className="mt-8 card p-6 border-emerald-500/30 bg-emerald-500/5 flex items-center gap-4">
          <Trophy className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-300">Training Complete!</p>
            <p className="text-sm text-slate-400 mt-0.5">You've completed all 10 phases. Congratulations on finishing the Cloud Training Program!</p>
          </div>
        </div>
      )}
    </div>
  )
}
