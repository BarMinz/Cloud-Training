import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { PHASES, STATUS_META } from '../data/phases'
import { SIMULATION_TICKETS, PRIORITY_META } from '../data/simulationTickets'
import ProgressRing from '../components/ProgressRing'
import {
  Users, Loader2, Trash2, ShieldCheck,
  Search, RefreshCw, Award, TrendingUp, Activity, RotateCcw,
  MessageSquare, X, Clock, User, Terminal, Eye, CheckCircle2, ChevronRight, Target, Lightbulb, Pencil, Camera, Lock, PowerOff,
} from 'lucide-react'
import { DIFFICULTY_COLORS } from '../data/phases'
import clsx from 'clsx'

export default function Admin() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [userDetail, setUserDetail] = useState({})
  const [actionLoading, setActionLoading] = useState(null)

  const [summary, setSummary] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [simViewer, setSimViewer] = useState(null)  // { username, tickets } | null
  const [simViewerActiveId, setSimViewerActiveId] = useState(null)
  const [simViewerLoading, setSimViewerLoading] = useState(false)
  const [phaseReview, setPhaseReview] = useState(null)  // { userId, username, phase, progress } | null
  const [reviewForm, setReviewForm] = useState({ grade: null, feedback: '', saving: false, saved: false })

  const [terminatingContainer, setTerminatingContainer] = useState(null) // userId
  const [containerStatuses, setContainerStatuses] = useState({}) // { [userId]: string }

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ username: '', email: '', role: '', newPassword: '', saving: false, error: '' })
  const [editAvatarUploading, setEditAvatarUploading] = useState(false)
  const editAvatarRef = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    setAnalyticsLoading(true)
    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/analytics/summary'),
    ])
      .then(([u, s]) => { setUsers(u); setSummary(s) })
      .catch(console.error)
      .finally(() => { setLoading(false); setAnalyticsLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const toggleExpand = async (userId) => {
    if (expanded === userId) { setExpanded(null); return }
    setExpanded(userId)
    let detail = userDetail[userId]
    if (!detail) {
      try {
        detail = await api.get(`/admin/users/${userId}`)
        setUserDetail((d) => ({ ...d, [userId]: detail }))
      } catch (err) { console.error(err); return }
    }
    // Always fetch fresh container status for Phase 2 users
    const phase2 = detail.progress?.find((p) => p.phase_id === 2)
    if (phase2 && (phase2.status === 'in_progress' || phase2.status === 'completed')) {
      api.get(`/containers/admin/${userId}/lamp`)
        .then((r) => setContainerStatuses((s) => ({ ...s, [userId]: r.status })))
        .catch(() => setContainerStatuses((s) => ({ ...s, [userId]: 'not_found' })))
    }
  }

  const changeRole = async (userId, role) => {
    setActionLoading(`role-${userId}`)
    try {
      await api.patch(`/admin/users/${userId}/role`, { role })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u))
    } catch (err) { alert(err.message) }
    finally { setActionLoading(null) }
  }

  const deleteUser = async (userId, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    setActionLoading(`del-${userId}`)
    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      if (expanded === userId) setExpanded(null)
    } catch (err) { alert(err.message) }
    finally { setActionLoading(null) }
  }

  const openEdit = (user) => {
    setEditTarget(user)
    setEditForm({ username: user.username, email: user.email, role: user.role, newPassword: '', saving: false, error: '' })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setEditForm((f) => ({ ...f, saving: true, error: '' }))
    try {
      const body = {}
      if (editForm.username !== editTarget.username) body.username = editForm.username
      if (editForm.email    !== editTarget.email)    body.email    = editForm.email
      if (editForm.role     !== editTarget.role)     body.role     = editForm.role
      if (editForm.newPassword)                      body.new_password = editForm.newPassword
      const res = await api.patch(`/admin/users/${editTarget.id}`, body)
      setUsers((prev) => prev.map((u) => u.id === editTarget.id
        ? { ...u, username: res.username, email: res.email, role: res.role }
        : u
      ))
      setEditTarget(null)
    } catch (err) {
      setEditForm((f) => ({ ...f, saving: false, error: err.message }))
    }
  }

  const handleEditAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditAvatarUploading(true)
    setEditForm((f) => ({ ...f, error: '' }))
    try {
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/users/${editTarget.id}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json().catch(() => ({ detail: res.statusText }))
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      setUsers((prev) => prev.map((u) => u.id === editTarget.id ? { ...u, avatar: data.avatar } : u))
      setEditTarget((t) => t ? { ...t, avatar: data.avatar } : t)
    } catch (err) {
      setEditForm((f) => ({ ...f, error: err.message }))
    } finally {
      setEditAvatarUploading(false)
      e.target.value = ''
    }
  }

  const ROLE_ORDER = { main_admin: 0, admin: 1, employee: 2 }

  const filtered = users
    .filter((u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const roleDiff = (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3)
      if (roleDiff !== 0) return roleDiff
      return a.username.localeCompare(b.username)
    })

  const openSimViewer = async (userId, username) => {
    setSimViewerLoading(true)
    setSimViewer({ username, tickets: null })
    try {
      const { sim_data } = await api.get(`/admin/users/${userId}/progress/1/simulation`)
      const tickets = sim_data ? JSON.parse(sim_data) : null
      setSimViewer({ username, tickets })
      if (tickets?.length) setSimViewerActiveId(tickets[0].id)
    } catch {
      setSimViewer({ username, tickets: null })
    } finally {
      setSimViewerLoading(false)
    }
  }

  const openReview = (userId, username, phase, progress) => {
    setPhaseReview({ userId, username, phase, progress })
    setReviewForm({ grade: progress.grade || null, feedback: progress.feedback || '', saving: false, saved: false, editing: !progress.grade })
  }

  const submitReview = async () => {
    if (!reviewForm.grade || !phaseReview) return
    setReviewForm((f) => ({ ...f, saving: true, saved: false }))
    try {
      await api.post(`/admin/users/${phaseReview.userId}/progress/${phaseReview.progress.phase_id}/review`, {
        grade: reviewForm.grade,
        feedback: reviewForm.feedback,
      })
      setReviewForm((f) => ({ ...f, saving: false, saved: true, editing: false }))
      // Update cached user detail so Review badge refreshes without reload
      setUserDetail((d) => {
        const prev = d[phaseReview.userId]
        if (!prev) return d
        return {
          ...d,
          [phaseReview.userId]: {
            ...prev,
            progress: prev.progress.map((p) =>
              p.phase_id === phaseReview.progress.phase_id
                ? { ...p, grade: reviewForm.grade, feedback: reviewForm.feedback }
                : p
            ),
          },
        }
      })
      const reviewedAt = new Date().toISOString()
      setPhaseReview((r) => r ? { ...r, progress: { ...r.progress, grade: reviewForm.grade, feedback: reviewForm.feedback, reviewed_at: reviewedAt } } : r)
    } catch (err) {
      alert(err.message)
      setReviewForm((f) => ({ ...f, saving: false }))
    }
  }

  const kpiCards = summary ? [
    { icon: Users,      color: 'text-brand-400',   bg: 'bg-brand-500/10',   label: 'Total Users',     value: summary.total_users,         sub: null },
    { icon: Award,      color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Fully Certified', value: summary.fully_certified,      sub: `${summary.certification_rate}%` },
    { icon: TrendingUp, color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Avg Phases Done', value: summary.avg_phases_completed, sub: 'of 10' },
    { icon: Activity,   color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Active (7 days)', value: summary.active_users_7d,      sub: null },
  ] : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-400" /> Admin Panel
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage employees and track training progress</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={clsx('w-4 h-4', (loading || analyticsLoading) && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      {analyticsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-white/5 mb-3" />
              <div className="h-3 bg-white/5 rounded w-20 mb-2" />
              <div className="h-7 bg-white/5 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {kpiCards.map(({ icon: Icon, color, bg, label, value, sub }) => (
            <div key={label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
              <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
              {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Search users by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">No users found.</div>
          )}
          {filtered.map((user) => {
            const pct = Math.round((user.completed_phases / PHASES.length) * 100)
            const isExpanded = expanded === user.id
            const detail = userDetail[user.id]

            return (
              <div key={user.id} className={clsx('card overflow-hidden transition-all duration-200', isExpanded && 'border-brand-500/30')}>
                {/* Row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {user.avatar
                      ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                      : user.username[0].toUpperCase()
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200 text-sm">{user.username}</span>
                      <span className={clsx(
                        'badge border text-xs',
                        user.role === 'main_admin'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : user.role === 'admin'
                          ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                          : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                      )}>
                        {user.role === 'main_admin' ? 'main admin' : user.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>

                  {/* Progress ring */}
                  {user.role !== 'main_admin' && (
                    <div className="hidden sm:flex items-center gap-3">
                      <div className="relative w-9 h-9">
                        <ProgressRing value={user.completed_phases} max={PHASES.length} size={36} stroke={3.5} color="#6366f1" />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{pct}%</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-200">{user.completed_phases}/{PHASES.length}</p>
                        <p className="text-xs text-slate-500">complete</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {user.role === 'main_admin' ? (
                      <span className="text-xs text-amber-500/60 hidden sm:block px-2">Protected</span>
                    ) : (
                      <>
                        <div title={currentUser?.id === user.id ? "You can't change your own role" : ''}>
                          <select
                            value={user.role}
                            onChange={(e) => changeRole(user.id, e.target.value)}
                            disabled={!!actionLoading || currentUser?.id === user.id}
                            className="bg-surface-3 border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 hidden sm:block disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <option value="employee">employee</option>
                            <option value="admin">admin</option>
                          </select>
                        </div>

                        <button
                          onClick={() => openEdit(user)}
                          title="Edit profile"
                          className="p-2 text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <div title={user.role === 'admin' ? 'Demote to employee before deleting' : ''}>
                          <button
                            onClick={() => deleteUser(user.id, user.username)}
                            disabled={actionLoading === `del-${user.id}` || user.role === 'admin'}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-500 disabled:hover:bg-transparent"
                          >
                            {actionLoading === `del-${user.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </>
                    )}

                    {user.role !== 'main_admin' && (
                      <button
                        onClick={() => toggleExpand(user.id)}
                        className={clsx(
                          'text-xs font-medium px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap',
                          isExpanded
                            ? 'bg-brand-500/15 text-brand-300 border-brand-500/30 hover:bg-brand-500/25'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200'
                        )}
                      >
                        {isExpanded ? 'Hide Progress' : 'Show Progress'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-white/8 px-4 pb-4 pt-3 animate-fade-in">
                    {!detail ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {detail.progress.map((p) => {
                          const ph = PHASES.find((x) => x.id === p.phase_id)
                          const sm = STATUS_META[p.status]
                          const isCompleted = p.status === 'completed'
                          return (
                            <div key={p.phase_id} className={clsx('rounded-xl p-2.5 border text-center relative group', sm.bg, sm.border)}>
                              <Link to={`/phase/${p.phase_id}`}>
                                <div className="text-lg mb-1">{ph?.icon}</div>
                                <p className="text-xs text-slate-300 font-medium leading-tight">{ph?.title}</p>
                                <p className={clsx('text-xs mt-1', sm.color)}>{sm.label}</p>
                              </Link>
                              {p.phase_id === 1 && (p.status === 'in_progress' || p.status === 'completed') && (
                                <button
                                  onClick={() => openSimViewer(user.id, user.username)}
                                  className="mt-1.5 w-full flex items-center justify-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                >
                                  <MessageSquare className="w-3 h-3" /> View Chats
                                </button>
                              )}
                              {p.phase_id === 2 && (p.status === 'in_progress' || p.status === 'completed') && containerStatuses[user.id] === 'running' && (
                                <>
                                  <button
                                    onClick={() => navigate(`/admin/terminal/${user.id}`)}
                                    className="mt-1.5 w-full flex items-center justify-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                  >
                                    <Terminal className="w-3 h-3" /> View Terminal
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Terminate ${user.username}'s LAMP container?`)) return
                                      setTerminatingContainer(user.id)
                                      try {
                                        await api.delete(`/containers/admin/${user.id}/lamp`)
                                        setContainerStatuses((s) => ({ ...s, [user.id]: 'not_found' }))
                                      } catch (err) { alert(err.message) }
                                      finally { setTerminatingContainer(null) }
                                    }}
                                    disabled={terminatingContainer === user.id}
                                    className="mt-1 w-full flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                  >
                                    {terminatingContainer === user.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <PowerOff className="w-3 h-3" />
                                    }
                                    Terminate
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openReview(user.id, user.username, ph, p)}
                                className={clsx(
                                  'mt-1.5 w-full flex items-center justify-center gap-1 text-xs transition-colors',
                                  p.grade === 'passed'     ? 'text-emerald-400 hover:text-emerald-300' :
                                  p.grade === 'not_passed' ? 'text-red-400 hover:text-red-300' :
                                                             'text-slate-500 hover:text-slate-300'
                                )}
                              >
                                <Eye className="w-3 h-3" />
                                {p.grade === 'passed' ? 'Passed ✓' : p.grade === 'not_passed' ? 'Not Passed ✗' : 'Review'}
                              </button>
                              {(isCompleted || p.status === 'in_progress') && (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Reset Phase ${p.phase_id} for ${user.username}?`)) return
                                    try {
                                      await api.post(`/admin/users/${user.id}/progress/${p.phase_id}/reset`)
                                      const updated = await api.get(`/admin/users/${user.id}`)
                                      setUserDetail((d) => ({ ...d, [user.id]: updated }))
                                      setUsers((prev) => prev.map((u) =>
                                        u.id === user.id
                                          ? {
                                              ...u,
                                              completed_phases: isCompleted ? u.completed_phases - 1 : u.completed_phases,
                                              in_progress_phases: p.status === 'in_progress' ? u.in_progress_phases - 1 : u.in_progress_phases,
                                            }
                                          : u
                                      ))
                                    } catch (err) { alert(err.message) }
                                  }}
                                  title="Reset this phase"
                                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/20 text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {/* Phase review modal */}
      {phaseReview && (() => {
        const { username, phase, progress } = phaseReview
        const sm = STATUS_META[progress.status]
        const dc = phase ? DIFFICULTY_COLORS[phase.difficulty] : null
        const canGrade = progress.status === 'completed'
        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPhaseReview(null)}>
            <div className="bg-surface-1 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {phase && (
                    <div className={clsx('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg shrink-0', phase.color)}>
                      {phase.icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500">Phase {progress.phase_id}</span>
                      {dc && <span className={clsx('badge border text-xs', dc.bg, dc.text, dc.border)}>{phase.difficulty}</span>}
                      <span className={clsx('badge border text-xs', sm.bg, sm.color, sm.border)}>{sm.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{phase?.title ?? `Phase ${progress.phase_id}`}</p>
                    <p className="text-xs text-slate-500">{username}</p>
                  </div>
                </div>
                <button onClick={() => setPhaseReview(null)} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                {/* Timeline */}
                {(progress.started_at || progress.completed_at) && (
                  <div className="flex gap-6 text-xs">
                    {progress.started_at && (
                      <div>
                        <p className="text-slate-500 mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Started</p>
                        <p className="text-slate-300">{new Date(progress.started_at).toLocaleString()}</p>
                      </div>
                    )}
                    {progress.completed_at && (
                      <div>
                        <p className="text-slate-500 mb-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed</p>
                        <p className="text-emerald-400">{new Date(progress.completed_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {progress.notes ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trainee Notes</p>
                    <pre className="text-sm text-slate-300 bg-surface-3 border border-white/8 rounded-xl px-4 py-3 whitespace-pre-wrap font-mono leading-relaxed max-h-36 overflow-y-auto">
                      {progress.notes}
                    </pre>
                  </div>
                ) : progress.status !== 'not_started' ? (
                  <p className="text-xs text-slate-600 italic">No notes recorded for this phase.</p>
                ) : null}

                {/* ── Grade & Feedback ── */}
                <div className={clsx('rounded-xl border p-4 space-y-4', canGrade ? 'border-white/10 bg-surface-3/50' : 'border-white/5 bg-surface-3/20')}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Grade & Feedback</p>
                    {canGrade && !reviewForm.editing && (
                      <button
                        onClick={() => setReviewForm((f) => ({ ...f, editing: true, saved: false }))}
                        className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        Edit Review
                      </button>
                    )}
                  </div>

                  {!canGrade && (
                    <p className="text-xs text-slate-500 italic">Phase must be completed before it can be graded.</p>
                  )}

                  {/* Read mode — existing review */}
                  {canGrade && !reviewForm.editing && (
                    <div className="space-y-3">
                      <div className={clsx(
                        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border',
                        reviewForm.grade === 'passed'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/20 border-red-500/40 text-red-300'
                      )}>
                        {reviewForm.grade === 'passed' ? '✓ Passed' : '✗ Not Passed'}
                      </div>
                      {reviewForm.feedback ? (
                        <pre className="text-sm text-slate-300 bg-surface-3 border border-white/8 rounded-xl px-4 py-3 whitespace-pre-wrap font-mono leading-relaxed max-h-36 overflow-y-auto">
                          {reviewForm.feedback}
                        </pre>
                      ) : (
                        <p className="text-xs text-slate-600 italic">No feedback written.</p>
                      )}
                      {progress.reviewed_at && (
                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Reviewed {new Date(progress.reviewed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Edit mode — grade form */}
                  {canGrade && reviewForm.editing && (
                    <>
                      {/* Grade buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setReviewForm((f) => ({ ...f, grade: 'passed', saved: false }))}
                          className={clsx(
                            'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                            reviewForm.grade === 'passed'
                              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                              : 'bg-white/3 border-white/10 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400'
                          )}
                        >
                          ✓ Passed
                        </button>
                        <button
                          onClick={() => setReviewForm((f) => ({ ...f, grade: 'not_passed', saved: false }))}
                          className={clsx(
                            'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                            reviewForm.grade === 'not_passed'
                              ? 'bg-red-500/20 border-red-500/60 text-red-300'
                              : 'bg-white/3 border-white/10 text-slate-400 hover:border-red-500/30 hover:text-red-400'
                          )}
                        >
                          ✗ Not Passed
                        </button>
                      </div>

                      {/* Feedback textarea */}
                      <textarea
                        rows={4}
                        value={reviewForm.feedback}
                        onChange={(e) => setReviewForm((f) => ({ ...f, feedback: e.target.value, saved: false }))}
                        placeholder="Write feedback for the trainee… (optional)"
                        className="input w-full resize-none text-sm"
                      />

                      {/* Submit */}
                      <div className="flex items-center justify-end gap-3">
                        {progress.grade && (
                          <button
                            onClick={() => setReviewForm((f) => ({ ...f, editing: false, grade: progress.grade, feedback: progress.feedback || '' }))}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={submitReview}
                          disabled={!reviewForm.grade || reviewForm.saving}
                          className={clsx(
                            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                            reviewForm.saved
                              ? 'bg-emerald-600/80 text-white'
                              : 'btn-primary disabled:opacity-40 disabled:cursor-not-allowed'
                          )}
                        >
                          {reviewForm.saving
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : reviewForm.saved
                            ? <><CheckCircle2 className="w-4 h-4" /> Saved</>
                            : progress.grade ? 'Update Review' : 'Submit Review'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Objectives */}
                {phase?.objectives && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-brand-400" /> Objectives
                    </p>
                    <ul className="space-y-1.5">
                      {phase.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <ChevronRight className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tasks */}
                {phase?.tasks && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tasks
                    </p>
                    <ul className="space-y-2">
                      {phase.tasks.map((task, i) => (
                        <li key={task.id} className="flex items-start gap-2.5 text-sm text-slate-300">
                          <span className="w-5 h-5 rounded-full bg-surface-3 border border-white/10 text-xs flex items-center justify-center text-slate-500 shrink-0 mt-0.5 font-mono">
                            {i + 1}
                          </span>
                          {task.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tips */}
                {phase?.tips && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Tips
                    </p>
                    <ul className="space-y-2">
                      {phase.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-slate-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2 leading-snug">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Simulation viewer modal */}
      {simViewer && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setSimViewer(null)}>
          <div className="bg-surface-1 border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold text-slate-200">Phase 1 Simulation</span>
                <span className="text-slate-500 text-sm">—</span>
                <span className="text-sm text-slate-400">{simViewer.username}</span>
              </div>
              <button onClick={() => setSimViewer(null)} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {simViewerLoading || simViewer.tickets === null ? (
              <div className="flex-1 flex items-center justify-center">
                {simViewerLoading
                  ? <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
                  : <p className="text-sm text-slate-500">No simulation data available yet.</p>
                }
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden">
                {/* Compute order tickets were opened */}
                {(() => {
                  const ORDINALS = ['1st', '2nd', '3rd', '4th']
                  const ticketOrder = {}
                  ;[...simViewer.tickets]
                    .filter((t) => t.messages.some((m) => m.from === 'agent'))
                    .sort((a, b) => {
                      // Prefer epoch stamp; fall back to parsing HH:MM of first agent message
                      const stamp = (t) => {
                        if (t.openedAt) return t.openedAt
                        const first = t.messages.find((m) => m.from === 'agent')
                        if (!first) return Infinity
                        const [h, m] = first.time.split(':').map(Number)
                        return h * 60 + m
                      }
                      return stamp(a) - stamp(b)
                    })
                    .forEach((t, i) => { ticketOrder[t.id] = ORDINALS[i] ?? `${i + 1}th` })

                  return (
                    <>
                {/* Ticket list */}
                <div className="w-56 shrink-0 border-r border-white/8 overflow-y-auto">
                  {simViewer.tickets.map((t) => {
                    const meta = SIMULATION_TICKETS.find((s) => s.id === t.id)
                    const assigned = PRIORITY_META[t.assignedPriority ?? 'unassigned']
                    const isCorrect = t.assignedPriority === meta?.priority
                    const isActive = t.id === simViewerActiveId
                    const ordinal = ticketOrder[t.id]
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSimViewerActiveId(t.id)}
                        className={clsx(
                          'w-full text-left px-3 py-3 border-b border-white/5 transition-all',
                          isActive ? 'bg-brand-500/10 border-l-2 border-l-brand-500' : 'hover:bg-white/3'
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={clsx('w-1.5 h-1.5 rounded-full shrink-0', assigned.dot)} />
                          <span className="text-xs font-mono text-slate-500">{t.id}</span>
                          <div className="ml-auto flex items-center gap-1">
                            {ordinal && (
                              <span className="text-xs font-semibold text-brand-400/80 bg-brand-500/10 rounded px-1">{ordinal}</span>
                            )}
                            {t.status === 'resolved' && <span className="text-xs text-emerald-400">✓</span>}
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-snug line-clamp-2">{meta?.subject || t.subject}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <p className={clsx('text-xs', assigned.color)}>{assigned.label}</p>
                          {t.assignedPriority && !isCorrect && (
                            <span className="text-xs text-amber-400/70" title={`Expected: ${PRIORITY_META[meta?.priority]?.label}`}>≠</span>
                          )}
                          {t.assignedPriority && isCorrect && (
                            <span className="text-xs text-emerald-400/70">✓</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Conversation */}
                {(() => {
                  const t = simViewer.tickets.find((t) => t.id === simViewerActiveId)
                  const meta = SIMULATION_TICKETS.find((s) => s.id === t?.id)
                  const pm = t ? PRIORITY_META[t.priority] : null
                  if (!t) return null
                  return (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/8 shrink-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-slate-500">{t.id}</span>
                          <span className={clsx('badge border text-xs', pm.bg, pm.color, pm.border)}>{pm.label}</span>
                          {t.status === 'resolved'
                            ? <span className="badge border text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Resolved</span>
                            : <span className="badge border text-xs bg-sky-500/15 text-sky-400 border-sky-500/30">Open</span>
                          }
                          {ticketOrder[t.id] && (
                            <span className="ml-auto text-xs font-semibold text-brand-400/80 bg-brand-500/10 border border-brand-500/20 rounded-md px-2 py-0.5">
                              Handled {ticketOrder[t.id]}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white">{meta?.subject || t.subject}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{t.customer.name}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.createdAt}</span>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                        {t.messages.map((msg, i) => {
                          const isAgent = msg.from === 'agent'
                          return (
                            <div key={i} className={clsx('flex gap-2.5', isAgent && 'flex-row-reverse')}>
                              <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', isAgent ? 'bg-brand-500 text-white' : 'bg-slate-600 text-slate-200')}>
                                {isAgent ? 'A' : t.customer.name[0]}
                              </div>
                              <div className={clsx('max-w-[65%]', isAgent && 'items-end flex flex-col')}>
                                <div className={clsx('text-xs mb-1 text-slate-500 flex gap-1.5', isAgent && 'justify-end')}>
                                  <span className="font-medium text-slate-400">{isAgent ? simViewer.username : t.customer.name}</span>
                                  <span>{msg.time}</span>
                                </div>
                                <div className={clsx('rounded-2xl px-3 py-2.5 text-xs leading-relaxed', isAgent ? 'bg-brand-500/20 text-slate-200 rounded-tr-sm' : 'bg-surface-3 text-slate-300 rounded-tl-sm')}>
                                  {msg.text}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {t.messages.length === 1 && (
                          <p className="text-xs text-slate-600 text-center py-4">No replies sent yet.</p>
                        )}
                      </div>
                    </div>
                  )
                })()}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-surface-1 border border-white/10 rounded-2xl w-full max-w-md flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold text-slate-200">Edit Profile</span>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveEdit} className="px-5 py-5 space-y-5">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-3xl font-bold text-white">
                    {editTarget.avatar
                      ? <img src={editTarget.avatar} alt={editTarget.username} className="w-full h-full object-cover" />
                      : editTarget.username[0].toUpperCase()
                    }
                  </div>
                  <button
                    type="button"
                    onClick={() => editAvatarRef.current?.click()}
                    disabled={editAvatarUploading}
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
                  >
                    {editAvatarUploading
                      ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                      : <Camera className="w-5 h-5 text-white" />
                    }
                  </button>
                  <input ref={editAvatarRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleEditAvatar} />
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    disabled={currentUser?.id === editTarget.id}
                    title={currentUser?.id === editTarget.id ? "You can't change your own role" : ''}
                    className="input w-full disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="employee">employee</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Reset Password <span className="text-slate-600">(leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
                    className="input w-full"
                    placeholder="New password (min 6 characters)"
                  />
                </div>
              </div>

              {editForm.error && <p className="text-xs text-red-400">{editForm.error}</p>}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={editForm.saving || !editForm.username || !editForm.email}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editForm.saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditTarget(null)} className="btn-ghost px-4">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
