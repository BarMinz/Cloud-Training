import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, X, Send, Hash, Volume2, VolumeX, Circle, Bell, BellOff } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'

const SCROLL_THRESHOLD = 80
const PUBLIC = 'public'

const isAdminRole = (role) => role === 'admin' || role === 'main_admin'

const STATUS_META = {
  active: { label: 'Active',         dot: 'bg-emerald-400' },
  away:   { label: 'Away',           dot: 'bg-amber-400' },
  dnd:    { label: 'Do not disturb', dot: 'bg-rose-500' },
  offline:{ label: 'Offline',        dot: 'bg-slate-500' },
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (sameDay) return `${hh}:${mm}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}

function Avatar({ username, avatar, size = 'sm' }) {
  const cls = size === 'xs' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs'
  return (
    <div className={clsx('rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center font-bold text-white shrink-0', cls)}>
      {avatar
        ? <img src={avatar} alt={username} className="w-full h-full object-cover" />
        : username?.[0]?.toUpperCase()
      }
    </div>
  )
}

function UserName({ name, admin, className }) {
  return <span className={clsx(className, admin && 'holo')}>{name}</span>
}

// Split content into text + @mention chips
function renderContent(content, usernameSet, adminUsernames, meUsername) {
  const parts = []
  const re = /(@[A-Za-z0-9_.-]+)/g
  let last = 0
  let m
  let i = 0
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push({ t: 'text', v: content.slice(last, m.index), k: i++ })
    const handle = m[1].slice(1)
    if (usernameSet.has(handle)) {
      parts.push({
        t: 'mention',
        v: m[1],
        k: i++,
        admin: adminUsernames.has(handle),
        me: handle === meUsername,
      })
    } else {
      parts.push({ t: 'text', v: m[1], k: i++ })
    }
    last = m.index + m[1].length
  }
  if (last < content.length) parts.push({ t: 'text', v: content.slice(last), k: i++ })
  return parts.map((p) => {
    if (p.t === 'text') return <span key={p.k}>{p.v}</span>
    return (
      <span
        key={p.k}
        className={clsx(
          'inline-block px-1 rounded font-medium',
          p.me ? 'bg-amber-400/30 text-amber-200' : 'bg-brand-500/25 text-brand-200',
          p.admin && 'holo'
        )}
      >
        {p.v}
      </span>
    )
  })
}

// Web Audio two-tone ding — fallback if /sounds/notification.mp3 is absent
function playSynthMeow(ctx) {
  const t0 = ctx.currentTime
  const tone = (freq, start, dur, peak) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(peak, start + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    o.connect(g).connect(ctx.destination)
    o.start(start)
    o.stop(start + dur + 0.02)
  }
  tone(988,  t0,        0.22, 0.18)   // B5
  tone(1319, t0 + 0.09, 0.32, 0.18)   // E6
}

export default function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(PUBLIC)
  const [users, setUsers] = useState([])
  const [onlineSet, setOnlineSet] = useState(() => new Set())
  const [statusById, setStatusById] = useState({})
  const [convos, setConvos] = useState({})
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [myStatus, setMyStatus] = useState(() => localStorage.getItem('chat:status') || 'active')
  const [muted, setMuted] = useState(() => localStorage.getItem('chat:muted') === '1')
  const [notifPerm, setNotifPerm] = useState(() => typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [mention, setMention] = useState({ open: false, query: '', start: -1, idx: 0 })

  const wsRef = useRef(null)
  const scrollerRef = useRef(null)
  const reconnectTimer = useRef(null)
  const audioCtxRef = useRef(null)
  const meowBufRef = useRef(null)
  const inputRef = useRef(null)
  const activeRef = useRef(active)
  const openRef = useRef(open)
  const mutedRef = useRef(muted)
  const statusRef = useRef(myStatus)
  activeRef.current = active
  openRef.current = open
  mutedRef.current = muted
  statusRef.current = myStatus

  const userMap = useMemo(() => {
    const m = new Map()
    users.forEach(u => m.set(u.id, u))
    if (user) m.set(user.id, { id: user.id, username: user.username, avatar: user.avatar, role: user.role })
    return m
  }, [users, user])

  const adminIds = useMemo(() => {
    const s = new Set()
    userMap.forEach((u, id) => { if (isAdminRole(u.role)) s.add(id) })
    return s
  }, [userMap])

  const usernameSet = useMemo(() => {
    const s = new Set()
    userMap.forEach((u) => s.add(u.username))
    return s
  }, [userMap])

  const adminUsernames = useMemo(() => {
    const s = new Set()
    userMap.forEach((u) => { if (isAdminRole(u.role)) s.add(u.username) })
    return s
  }, [userMap])

  const userStatus = useCallback((id) => {
    if (!onlineSet.has(id)) return 'offline'
    return statusById[String(id)] || 'active'
  }, [onlineSet, statusById])

  const convoKey = useCallback((msg) => {
    if (msg.recipient_id == null) return PUBLIC
    return msg.user_id === user?.id ? String(msg.recipient_id) : String(msg.user_id)
  }, [user])

  const activeMsgs = convos[active]?.msgs || []
  const totalUnread = useMemo(() => {
    return Object.entries(convos).reduce((sum, [k, c]) => sum + (k === activeRef.current && openRef.current ? 0 : (c.unread || 0)), 0)
  }, [convos, active, open])

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const isNearBottom = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD
  }, [])

  const ensureAudio = useCallback(async () => {
    if (audioCtxRef.current) return audioCtxRef.current
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return null
      const ctx = new Ctx()
      audioCtxRef.current = ctx
      // Try to load real meow.mp3 if present; ignore failure (falls back to synth)
      try {
        const res = await fetch('/sounds/notification.mp3')
        if (res.ok) {
          const buf = await res.arrayBuffer()
          meowBufRef.current = await ctx.decodeAudioData(buf)
        }
      } catch {}
      return ctx
    } catch { return null }
  }, [])

  const playMeow = useCallback(async () => {
    if (mutedRef.current || statusRef.current === 'dnd') return
    const ctx = await ensureAudio()
    if (!ctx) return
    if (ctx.state === 'suspended') { try { await ctx.resume() } catch {} }
    if (meowBufRef.current) {
      const src = ctx.createBufferSource()
      src.buffer = meowBufRef.current
      const gain = ctx.createGain()
      gain.gain.value = 0.6
      src.connect(gain).connect(ctx.destination)
      src.start()
    } else {
      playSynthMeow(ctx)
    }
  }, [ensureAudio])

  const fireNotification = useCallback((title, body, tag) => {
    if (statusRef.current === 'dnd') return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && openRef.current) return
    try {
      const n = new Notification(title, { body, tag, icon: '/favicon.ico' })
      n.onclick = () => { window.focus(); n.close() }
      setTimeout(() => n.close(), 6000)
    } catch {}
  }, [])

  const ensureLoaded = useCallback(async (key) => {
    if (convos[key]?.loaded) return
    let rows = []
    try {
      rows = key === PUBLIC
        ? await api.get('/chat/history')
        : await api.get(`/chat/dm/${key}`)
    } catch {}
    setConvos((prev) => ({
      ...prev,
      [key]: { msgs: rows || [], loaded: true, unread: 0 },
    }))
    requestAnimationFrame(() => scrollToBottom(false))
  }, [convos, scrollToBottom])

  const sendStatus = useCallback((value) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'status', value }))
    }
  }, [])

  const changeStatus = (value) => {
    setMyStatus(value)
    localStorage.setItem('chat:status', value)
    sendStatus(value)
    setShowStatusMenu(false)
  }

  const connect = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/api/chat/ws?token=${encodeURIComponent(token)}`)
    wsRef.current = ws
    ws.onopen = () => {
      setConnected(true)
      setError('')
      ws.send(JSON.stringify({ type: 'status', value: statusRef.current }))
    }
    ws.onclose = () => {
      setConnected(false)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      reconnectTimer.current = setTimeout(() => {
        if (localStorage.getItem('token')) connect()
      }, 2500)
    }
    ws.onerror = () => {}
    ws.onmessage = (e) => {
      let m
      try { m = JSON.parse(e.data) } catch { return }
      if (m.type === 'message') {
        const key = convoKey(m)
        const stick = isNearBottom() && activeRef.current === key
        const mine = m.user_id === user?.id
        setConvos((prev) => {
          const cur = prev[key] || { msgs: [], loaded: key === PUBLIC, unread: 0 }
          const isActive = activeRef.current === key && openRef.current
          return {
            ...prev,
            [key]: {
              ...cur,
              msgs: [...cur.msgs, m],
              unread: isActive ? 0 : (cur.unread || 0) + (mine ? 0 : 1),
            },
          }
        })
        if (!mine) {
          playMeow()
          const myHandle = user?.username
          const mentionsMe = myHandle && new RegExp(`(^|\\W)@${myHandle}(\\W|$)`).test(m.content)
          const isDM = m.recipient_id != null
          if (mentionsMe || isDM) {
            const title = mentionsMe ? `${m.username} mentioned you` : `${m.username} (DM)`
            fireNotification(title, m.content.slice(0, 140), `chat:${key}`)
          }
        }
        if (stick) requestAnimationFrame(() => scrollToBottom())
      } else if (m.type === 'presence') {
        setOnlineSet(new Set(m.online_user_ids || []))
        setStatusById(m.status_by_id || {})
      } else if (m.type === 'error') {
        setError(m.message || 'Error')
        setTimeout(() => setError(''), 2500)
      }
    }
  }, [convoKey, isNearBottom, scrollToBottom, user, playMeow, fireNotification])

  useEffect(() => {
    if (!user) return
    api.get('/chat/users').then((rows) => setUsers(rows || [])).catch(() => {})
    ensureLoaded(PUBLIC)
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!open) return
    ensureLoaded(active)
    setConvos((prev) => prev[active] ? { ...prev, [active]: { ...prev[active], unread: 0 } } : prev)
    requestAnimationFrame(() => scrollToBottom(false))
  }, [active, open, ensureLoaded, scrollToBottom])

  useEffect(() => {
    if (!user) return
    api.get('/chat/users').then((rows) => setUsers(rows || [])).catch(() => {})
  }, [onlineSet, user])

  // Mention autocomplete state machine off the draft
  const updateMention = (text, caret) => {
    let i = caret - 1
    while (i >= 0 && /[A-Za-z0-9_.-]/.test(text[i])) i--
    if (i >= 0 && text[i] === '@' && (i === 0 || /\s/.test(text[i - 1]))) {
      setMention({ open: true, query: text.slice(i + 1, caret), start: i, idx: 0 })
    } else {
      setMention({ open: false, query: '', start: -1, idx: 0 })
    }
  }

  const mentionCandidates = useMemo(() => {
    if (!mention.open) return []
    const q = mention.query.toLowerCase()
    return users.filter((u) => u.username.toLowerCase().startsWith(q)).slice(0, 6)
  }, [mention, users])

  const acceptMention = (u) => {
    if (mention.start < 0) return
    const before = draft.slice(0, mention.start)
    const after = draft.slice(mention.start + 1 + mention.query.length)
    const inserted = `@${u.username} `
    const next = before + inserted + after
    setDraft(next)
    setMention({ open: false, query: '', start: -1, idx: 0 })
    requestAnimationFrame(() => {
      const pos = (before + inserted).length
      inputRef.current?.setSelectionRange(pos, pos)
      inputRef.current?.focus()
    })
  }

  const handleDraftChange = (e) => {
    const v = e.target.value
    setDraft(v)
    updateMention(v, e.target.selectionStart || v.length)
  }

  const handleKeyDown = (e) => {
    if (mention.open && mentionCandidates.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMention(p => ({ ...p, idx: (p.idx + 1) % mentionCandidates.length })); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMention(p => ({ ...p, idx: (p.idx - 1 + mentionCandidates.length) % mentionCandidates.length })); return }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); acceptMention(mentionCandidates[mention.idx]); return }
      if (e.key === 'Escape')    { e.preventDefault(); setMention({ open: false, query: '', start: -1, idx: 0 }); return }
    }
  }

  const send = (e) => {
    e?.preventDefault?.()
    if (mention.open) return
    const text = draft.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== 1) return
    const payload = active === PUBLIC ? { content: text } : { content: text, to: Number(active) }
    wsRef.current.send(JSON.stringify(payload))
    setDraft('')
    setMention({ open: false, query: '', start: -1, idx: 0 })
  }

  const requestNotifPerm = async () => {
    try {
      const p = await Notification.requestPermission()
      setNotifPerm(p)
    } catch {}
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    localStorage.setItem('chat:muted', next ? '1' : '0')
    if (!next) ensureAudio()
  }

  if (!user) return null

  const activeUser = active !== PUBLIC ? userMap.get(Number(active)) : null

  const sortedUsers = useMemo(() => {
    const order = (st) => st === 'active' ? 0 : st === 'away' ? 1 : st === 'dnd' ? 2 : 3
    return [...users].sort((a, b) => {
      const da = order(userStatus(a.id))
      const db = order(userStatus(b.id))
      if (da !== db) return da - db
      return a.username.localeCompare(b.username)
    })
  }, [users, userStatus])

  const myStatusMeta = STATUS_META[myStatus] || STATUS_META.active
  const showNotifBanner = open && notifPerm === 'default'

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="card glass w-[34rem] sm:w-[36rem] h-[30rem] flex shadow-2xl overflow-hidden"
          >
            <div className="w-40 border-r border-white/8 flex flex-col bg-surface-1/40">
              <div className="px-3 py-2.5 border-b border-white/8 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Chats</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleMute}
                    className="btn-ghost p-0.5 rounded"
                    title={muted ? 'Unmute sounds' : 'Mute sounds'}
                  >
                    {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusMenu((s) => !s)}
                      className="btn-ghost p-0.5 rounded flex items-center gap-1"
                      title={myStatusMeta.label}
                    >
                      <Circle className={clsx('w-2.5 h-2.5 fill-current', myStatus === 'active' && 'text-emerald-400', myStatus === 'away' && 'text-amber-400', myStatus === 'dnd' && 'text-rose-500')} />
                    </button>
                    {showStatusMenu && (
                      <div className="absolute right-0 mt-1 w-36 card glass py-1 z-10">
                        {['active', 'away', 'dnd'].map((s) => (
                          <button
                            key={s}
                            onClick={() => changeStatus(s)}
                            className={clsx(
                              'w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors',
                              myStatus === s ? 'bg-brand-600/20 text-brand-200' : 'text-slate-300 hover:bg-white/5'
                            )}
                          >
                            <span className={clsx('w-2 h-2 rounded-full', STATUS_META[s].dot)} />
                            {STATUS_META[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                <button
                  onClick={() => setActive(PUBLIC)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                    active === PUBLIC ? 'bg-brand-600/20 text-brand-200' : 'text-slate-300 hover:bg-white/5'
                  )}
                >
                  <Hash className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">public</span>
                  {convos[PUBLIC]?.unread > 0 && active !== PUBLIC && (
                    <span className="text-[10px] font-bold px-1.5 rounded-full bg-rose-500 text-white">{convos[PUBLIC].unread}</span>
                  )}
                </button>
                <div className="mt-2 px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Users</div>
                {sortedUsers.length === 0 && (
                  <div className="px-3 text-xs text-slate-500">No other users</div>
                )}
                {sortedUsers.map((u) => {
                  const key = String(u.id)
                  const st = userStatus(u.id)
                  const unread = convos[key]?.unread || 0
                  const admin = adminIds.has(u.id)
                  return (
                    <button
                      key={u.id}
                      onClick={() => setActive(key)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                        active === key ? 'bg-brand-600/20 text-brand-200' : 'text-slate-300 hover:bg-white/5'
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar username={u.username} avatar={u.avatar} size="xs" />
                        <span className={clsx('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface-1', STATUS_META[st].dot)} />
                      </div>
                      <UserName name={u.username} admin={admin} className={clsx('flex-1 text-left truncate', st === 'offline' && !admin && 'text-slate-500')} />
                      {unread > 0 && active !== key && (
                        <span className="text-[10px] font-bold px-1.5 rounded-full bg-rose-500 text-white">{unread}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                <div className="flex items-center gap-2 min-w-0">
                  {active === PUBLIC ? (
                    <>
                      <Hash className="w-4 h-4 text-brand-400" />
                      <span className="font-semibold text-slate-100 text-sm">public</span>
                    </>
                  ) : activeUser ? (
                    <>
                      <Avatar username={activeUser.username} avatar={activeUser.avatar} size="xs" />
                      <UserName name={activeUser.username} admin={adminIds.has(activeUser.id)} className="font-semibold text-slate-100 text-sm truncate" />
                      <span className={clsx(
                        'text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1',
                        userStatus(activeUser.id) === 'active' && 'bg-emerald-500/15 text-emerald-300',
                        userStatus(activeUser.id) === 'away' && 'bg-amber-500/15 text-amber-300',
                        userStatus(activeUser.id) === 'dnd' && 'bg-rose-500/15 text-rose-300',
                        userStatus(activeUser.id) === 'offline' && 'bg-slate-500/15 text-slate-400',
                      )}>
                        {STATUS_META[userStatus(activeUser.id)].label}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-slate-100 text-sm">Direct message</span>
                  )}
                </div>
                <button onClick={() => setOpen(false)} className="btn-ghost p-1 rounded-lg" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {showNotifBanner && (
                <div className="px-3 py-2 bg-brand-600/15 border-b border-brand-500/30 flex items-center gap-2 text-xs">
                  <Bell className="w-3.5 h-3.5 text-brand-300 shrink-0" />
                  <span className="text-slate-200 flex-1">Get notified for mentions and DMs?</span>
                  <button onClick={requestNotifPerm} className="px-2 py-0.5 rounded bg-brand-600 hover:bg-brand-500 text-white font-medium">Allow</button>
                  <button onClick={() => setNotifPerm('denied')} className="btn-ghost px-2 py-0.5 rounded"><BellOff className="w-3.5 h-3.5" /></button>
                </div>
              )}

              <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {activeMsgs.length === 0 && (
                  <div className="text-center text-xs text-slate-500 pt-8">
                    {active === PUBLIC ? 'No messages yet. Say hi 👋' : `Start a conversation with ${activeUser?.username || ''}.`}
                  </div>
                )}
                {activeMsgs.map((m) => {
                  const mine = m.user_id === user.id
                  const admin = adminIds.has(m.user_id)
                  return (
                    <div key={m.id} className={clsx('flex gap-2 items-end', mine && 'flex-row-reverse')}>
                      <Avatar username={m.username} avatar={m.avatar} />
                      <div className={clsx('flex flex-col max-w-[75%]', mine && 'items-end')}>
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <UserName name={mine ? 'You' : m.username} admin={admin && !mine} className="text-xs font-medium text-slate-300" />
                          <span className="text-[10px] text-slate-500">{formatTime(m.created_at)}</span>
                        </div>
                        <div className={clsx(
                          'rounded-2xl px-3 py-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap',
                          mine
                            ? 'bg-brand-600/80 text-white rounded-br-sm'
                            : 'bg-white/5 border border-white/8 text-slate-200 rounded-bl-sm'
                        )}>
                          {renderContent(m.content, usernameSet, adminUsernames, user.username)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {error && (
                <div className="px-4 py-1.5 text-xs text-rose-300 bg-rose-500/10 border-t border-rose-500/20">
                  {error}
                </div>
              )}

              <div className="relative">
                {mention.open && mentionCandidates.length > 0 && (
                  <div className="absolute bottom-full left-3 right-3 mb-1 card glass py-1 max-h-44 overflow-y-auto z-20">
                    {mentionCandidates.map((u, idx) => {
                      const admin = adminIds.has(u.id)
                      return (
                        <button
                          key={u.id}
                          onMouseDown={(e) => { e.preventDefault(); acceptMention(u) }}
                          className={clsx(
                            'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors text-left',
                            idx === mention.idx ? 'bg-brand-600/20 text-brand-200' : 'text-slate-300 hover:bg-white/5'
                          )}
                        >
                          <Avatar username={u.username} avatar={u.avatar} size="xs" />
                          <UserName name={u.username} admin={admin} className="flex-1 truncate" />
                          <span className={clsx('w-1.5 h-1.5 rounded-full', STATUS_META[userStatus(u.id)].dot)} />
                        </button>
                      )
                    })}
                  </div>
                )}
                <form onSubmit={send} className="flex items-center gap-2 px-3 py-2.5 border-t border-white/8">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => updateMention(e.target.value, e.target.selectionStart || 0)}
                    placeholder={connected
                      ? (active === PUBLIC ? 'Message public… (@ to mention)' : `Message ${activeUser?.username || ''}…`)
                      : 'Reconnecting…'}
                    disabled={!connected}
                    maxLength={1000}
                    className="input py-2 text-sm flex-1"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={!connected || !draft.trim()}
                    className="btn-primary py-2 px-3 text-sm shadow-none"
                    title="Send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!open && (
          <motion.button
            key="bubble"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={() => setOpen(true)}
            className="relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform bg-gradient-to-br from-brand-500 to-violet-600 hover:scale-105 active:scale-95"
            title="Open chat"
          >
            <MessageCircle className="w-5 h-5 text-white" />
            <span className={clsx('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-0', STATUS_META[myStatus].dot)} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface-0">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
