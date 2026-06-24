import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { PHASES, STATUS_META } from '../data/phases'
import ProgressRing from '../components/ProgressRing'
import {
  Users, CheckCircle2, Loader2, Zap, Trash2, ShieldCheck,
  UserRound, ChevronDown, ChevronUp, Search, RefreshCw
} from 'lucide-react'
import clsx from 'clsx'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [userDetail, setUserDetail] = useState({})
  const [actionLoading, setActionLoading] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/admin/users')
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleExpand = async (userId) => {
    if (expanded === userId) { setExpanded(null); return }
    setExpanded(userId)
    if (!userDetail[userId]) {
      try {
        const detail = await api.get(`/admin/users/${userId}`)
        setUserDetail((d) => ({ ...d, [userId]: detail }))
      } catch (err) { console.error(err) }
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

  const filtered = users.filter(
    (u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalCompleted = users.reduce((s, u) => s + u.completed_phases, 0)
  const totalInProgress = users.reduce((s, u) => s + u.in_progress_phases, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-400" /> Admin Panel
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage employees and track training progress</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: Users, color: 'text-brand-400', bg: 'bg-brand-500/10', label: 'Total Users', value: users.length },
          { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Phases Completed', value: totalCompleted },
          { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'In Progress', value: totalInProgress },
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
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200 text-sm">{user.username}</span>
                      <span className={clsx(
                        'badge border text-xs',
                        user.role === 'admin'
                          ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                          : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                      )}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>

                  {/* Progress */}
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

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      disabled={!!actionLoading}
                      className="bg-surface-3 border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 hidden sm:block"
                    >
                      <option value="employee">employee</option>
                      <option value="admin">admin</option>
                    </select>

                    <button
                      onClick={() => deleteUser(user.id, user.username)}
                      disabled={actionLoading === `del-${user.id}`}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      {actionLoading === `del-${user.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => toggleExpand(user.id)}
                      className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
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
                          return (
                            <Link
                              key={p.phase_id}
                              to={`/phase/${p.phase_id}`}
                              className={clsx(
                                'rounded-xl p-2.5 border text-center transition-all hover:border-white/20',
                                sm.bg, sm.border
                              )}
                            >
                              <div className="text-lg mb-1">{ph?.icon}</div>
                              <p className="text-xs text-slate-300 font-medium leading-tight">{ph?.title}</p>
                              <p className={clsx('text-xs mt-1', sm.color)}>{sm.label}</p>
                            </Link>
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
    </div>
  )
}
