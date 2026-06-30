import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { User, Mail, Calendar, Lock, Loader2, CheckCircle2, Eye, EyeOff, Camera, Pencil, X } from 'lucide-react'
import { usePhases } from '../contexts/PhasesContext'
import ProgressRing from '../components/ProgressRing'
import clsx from 'clsx'

const ROLE_META = {
  main_admin: { label: 'Main Admin', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  admin:      { label: 'Admin',      bg: 'bg-brand-500/15', text: 'text-brand-300', border: 'border-brand-500/30' },
  employee:   { label: 'Employee',   bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' },
}

function SuccessBadge({ message }) {
  return (
    <p className="text-xs text-emerald-400 flex items-center gap-1">
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {message}
    </p>
  )
}

export default function Profile() {
  const { phases: PHASES } = usePhases()
  const { user, refreshUser } = useAuth()
  const fileInputRef = useRef(null)

  const [progress, setProgress]           = useState([])
  const [progressLoading, setProgressLoading] = useState(true)

  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError]         = useState('')

  // Email form
  const [emailEdit, setEmailEdit]   = useState(false)
  const [emailForm, setEmailForm]   = useState({ email: '', password: '', saving: false, error: '', success: false })

  // Password form
  const [pwForm, setPwForm]   = useState({ current: '', newPw: '', confirm: '', saving: false, error: '', success: false })
  const [showPw, setShowPw]   = useState(false)

  useEffect(() => {
    api.get('/progress/')
      .then(setProgress)
      .catch(console.error)
      .finally(() => setProgressLoading(false))
  }, [])

  // Sync email field when user loads
  useEffect(() => {
    if (user) setEmailForm((f) => ({ ...f, email: user.email }))
  }, [user?.email])

  const completed  = progress.filter((p) => p.status === 'completed').length
  const inProgress = progress.filter((p) => p.status === 'in_progress').length
  const pct        = Math.round((completed / PHASES.length) * 100)
  const rm         = ROLE_META[user?.role] ?? ROLE_META.employee

  // ── Avatar upload ────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be under 2 MB.')
      return
    }
    setAvatarError('')
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/me/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json().catch(() => ({ detail: res.statusText }))
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      await refreshUser()
    } catch (err) {
      setAvatarError(err.message)
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  // ── Email change ─────────────────────────────────────────────────
  const saveEmail = async (e) => {
    e.preventDefault()
    setEmailForm((f) => ({ ...f, saving: true, error: '' }))
    try {
      await api.patch('/auth/me/email', { email: emailForm.email, current_password: emailForm.password })
      await refreshUser()
      setEmailForm((f) => ({ ...f, saving: false, success: true, password: '' }))
      setEmailEdit(false)
    } catch (err) {
      setEmailForm((f) => ({ ...f, saving: false, error: err.message }))
    }
  }

  // ── Password change ───────────────────────────────────────────────
  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) {
      setPwForm((f) => ({ ...f, error: 'Passwords do not match' }))
      return
    }
    setPwForm((f) => ({ ...f, saving: true, error: '' }))
    try {
      await api.patch('/auth/me/password', { current_password: pwForm.current, new_password: pwForm.newPw })
      setPwForm({ current: '', newPw: '', confirm: '', saving: false, error: '', success: true })
    } catch (err) {
      setPwForm((f) => ({ ...f, saving: false, error: err.message }))
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-brand-400" /> My Profile
        </h1>
        <p className="text-slate-400 text-sm mt-1">Account info and training progress</p>
      </div>

      {/* ── Identity card ─────────────────────────────────────────── */}
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-3xl font-bold text-white">
              {user?.avatar
                ? <img src={user.avatar} alt={user?.username} className="w-full h-full object-cover" />
                : user?.username?.[0]?.toUpperCase()
              }
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
              title="Change photo"
            >
              {avatarUploading
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <Camera className="w-5 h-5 text-white" />
              }
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white truncate">{user?.username}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={clsx('badge border text-xs', rm.bg, rm.text, rm.border)}>{rm.label}</span>
              {user?.created_at && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Member since {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              )}
            </div>
            {avatarError && <p className="text-xs text-red-400 mt-2">{avatarError}</p>}
            <p className="text-xs text-slate-600 mt-2">Click photo to change · JPEG, PNG, GIF or WebP · max 2 MB</p>
          </div>
        </div>
      </div>

      {/* ── Email ─────────────────────────────────────────────────── */}
      <div className="card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-brand-400" /> Email Address
          </h3>
          {!emailEdit && (
            <button
              onClick={() => { setEmailEdit(true); setEmailForm((f) => ({ ...f, email: user?.email ?? '', password: '', error: '', success: false })) }}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        {!emailEdit ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-200">{user?.email}</span>
            {emailForm.success && <SuccessBadge message="Email updated!" />}
          </div>
        ) : (
          <form onSubmit={saveEmail} className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">New Email</label>
              <input
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value, error: '' }))}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Current Password (to confirm)</label>
              <input
                type="password"
                value={emailForm.password}
                onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value, error: '' }))}
                className="input w-full"
                placeholder="Enter your password"
                required
              />
            </div>
            {emailForm.error && <p className="text-xs text-red-400">{emailForm.error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={emailForm.saving || !emailForm.email || !emailForm.password}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {emailForm.saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEmailEdit(false)}
                className="btn-ghost flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Progress summary ─────────────────────────────────────── */}
      <div className="card p-6 mb-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Training Progress
        </h3>
        {progressLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          </div>
        ) : (
          <div className="flex items-center gap-8">
            <div className="relative w-20 h-20 shrink-0">
              <ProgressRing value={completed} max={PHASES.length} size={80} stroke={6} color="#6366f1" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white leading-none">{pct}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /> Completed
                </span>
                <span className="font-semibold text-white">{completed} / {PHASES.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" /> In Progress
                </span>
                <span className="font-semibold text-white">{inProgress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" /> Not Started
                </span>
                <span className="font-semibold text-white">{PHASES.length - completed - inProgress}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Change password ──────────────────────────────────────── */}
      <div className="card p-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-brand-400" /> Change Password
        </h3>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Current Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={pwForm.current}
              onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value, success: false }))}
              className="input w-full"
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">New Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={pwForm.newPw}
              onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value, error: '', success: false }))}
              className="input w-full"
              placeholder="At least 6 characters"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Confirm New Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value, error: '', success: false }))}
              className="input w-full"
              placeholder="Repeat new password"
              required
            />
          </div>
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
          >
            {showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPw ? 'Hide' : 'Show'} passwords
          </button>
          {pwForm.error   && <p className="text-xs text-red-400">{pwForm.error}</p>}
          {pwForm.success && <SuccessBadge message="Password changed successfully!" />}
          <button
            type="submit"
            disabled={pwForm.saving || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pwForm.saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
