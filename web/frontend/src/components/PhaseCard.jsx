import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Loader2, ChevronRight, Clock, Lock } from 'lucide-react'
import clsx from 'clsx'
import { DIFFICULTY_COLORS, STATUS_META } from '../data/phases'

export default function PhaseCard({ phase, progress, locked, index }) {
  const status = progress?.status || 'not_started'
  const sm = STATUS_META[status]
  const dc = DIFFICULTY_COLORS[phase.difficulty]

  const StatusIcon = status === 'completed' ? CheckCircle2
    : status === 'in_progress' ? Loader2
    : Circle

  const inner = (
    <>
      {/* Gradient accent strip */}
      {!locked && (
        <div className={clsx('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300', phase.color)} />
      )}

      {/* Phase number + icon */}
      <div className="flex items-start justify-between">
        <div className={clsx(
          'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl shrink-0 shadow-lg transition-all',
          locked ? 'opacity-30 grayscale' : phase.color
        )}>
          {phase.icon}
        </div>
        <div className="flex items-center gap-2">
          {locked ? (
            <span className="badge border bg-slate-500/10 text-slate-500 border-slate-500/20 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked
            </span>
          ) : (
            <span className={clsx('badge border', sm.bg, sm.color, sm.border)}>
              <StatusIcon className={clsx('w-3 h-3', status === 'in_progress' && 'animate-spin')} />
              {sm.label}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={clsx('text-xs font-mono', locked ? 'text-slate-600' : 'text-slate-500')}>Phase {phase.id}</span>
        </div>
        <h3 className={clsx('font-semibold transition-colors', locked ? 'text-slate-600' : 'text-slate-100 group-hover:text-white')}>{phase.title}</h3>
        <p className={clsx('text-xs mt-0.5', locked ? 'text-slate-700' : 'text-slate-400')}>{phase.subtitle}</p>
      </div>

      {/* Description */}
      <p className={clsx('text-sm leading-relaxed line-clamp-2 flex-1', locked ? 'text-slate-700' : 'text-slate-400')}>
        {locked ? `Complete Phase ${phase.id - 1} to unlock this phase.` : phase.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <div className="flex items-center gap-3">
          <span className={clsx('badge border text-xs', locked ? 'bg-slate-500/5 text-slate-600 border-slate-500/10' : `${dc.bg} ${dc.text} ${dc.border}`)}>
            {phase.difficulty}
          </span>
          <span className={clsx('flex items-center gap-1 text-xs', locked ? 'text-slate-700' : 'text-slate-500')}>
            <Clock className="w-3 h-3" />
            {phase.estimatedTime}
          </span>
        </div>
        {!locked && <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 transition-colors" />}
        {locked && <Lock className="w-4 h-4 text-slate-700" />}
      </div>
    </>
  )

  if (locked) {
    return (
      <div
        className="card group relative overflow-hidden flex flex-col gap-4 p-5 cursor-not-allowed opacity-60"
        style={{ animationDelay: `${index * 40}ms` }}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      to={`/phase/${phase.id}`}
      className={clsx(
        'card group relative overflow-hidden flex flex-col gap-4 p-5',
        'transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30',
        status === 'completed' && 'border-emerald-500/20',
        status === 'in_progress' && 'border-amber-500/20',
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {inner}
    </Link>
  )
}
