import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { SIMULATION_TICKETS, PRIORITY_META } from '../data/simulationTickets'
import { ArrowLeft, Send, CheckCircle2, Clock, User, Inbox, AlertCircle, Lock, Loader2, Lightbulb } from 'lucide-react'
import clsx from 'clsx'

function initTickets() {
  return SIMULATION_TICKETS.map((t) => ({
    ...t,
    messages: [...t.messages],
    followUpIndex: 0,
    status: 'open',
    assignedPriority: null,
  }))
}

export default function TicketSimulation() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const storageKey = user?.id ? `sim_phase1_${user.id}` : null

  const [tickets, setTickets] = useState(null)
  const [activeId, setActiveId] = useState(SIMULATION_TICKETS[0].id)
  const [reply, setReply] = useState('')
  const [typing, setTyping] = useState(false)
  const [done, setDone] = useState(false)
  const [phaseCompleted, setPhaseCompleted] = useState(false)
  const threadRef = useRef(null)

  const allResolved = tickets?.every((t) => t.status === 'resolved') ?? false
  const readOnly = phaseCompleted || (allResolved && !done)

  useEffect(() => {
    api.get('/progress/')
      .then((all) => {
        const p = all.find((x) => x.phase_id === 1)
        const status = p?.status ?? 'not_started'
        setPhaseCompleted(status === 'completed')

        // Use backend sim_data as source of truth — clears localStorage when null
        if (storageKey) localStorage.removeItem(storageKey)
        try {
          const parsed = p?.sim_data ? JSON.parse(p.sim_data) : null
          setTickets(Array.isArray(parsed) ? parsed : initTickets())
        } catch {
          setTickets(initTickets())
        }
      })
      .catch(() => setTickets(initTickets()))
  }, [storageKey])

  const active = tickets?.find((t) => t.id === activeId)
  const pm = active ? PRIORITY_META[active.assignedPriority ?? 'unassigned'] : null

  const setPriority = (ticketId, priority) => {
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, assignedPriority: priority } : t))
  }

  // Persist to localStorage and backend on every ticket change (skip while still loading)
  useEffect(() => {
    if (tickets === null) return
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(tickets))
    api.put('/progress/1/simulation', { sim_data: JSON.stringify(tickets) }).catch(console.error)
  }, [tickets, storageKey])

  // Scroll thread to bottom when messages change
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [active?.messages, typing])

  const isRelevant = (text, exchange) => {
    if (!exchange?.keywords) return true
    const lower = text.toLowerCase()
    return exchange.keywords.some((kw) => lower.includes(kw))
  }

  const hasManners = (text, exchange) => {
    if (!exchange?.mannersKeywords) return true
    const lower = text.toLowerCase()
    return exchange.mannersKeywords.some((kw) => lower.includes(kw))
  }

  const sendReply = () => {
    const text = reply.trim()
    if (!text || typing) return
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    if (text.toLowerCase() === '/hint') {
      const ticket = tickets.find((t) => t.id === activeId)
      const exchange = ticket.exchanges?.[ticket.followUpIndex]
      const hintText = exchange?.hint ?? "No hint available for this step — you're on the right track!"
      setTickets((prev) =>
        prev.map((t) =>
          t.id !== activeId ? t : { ...t, messages: [...t.messages, { from: 'system', text: hintText, time: now, _hint: true }] }
        )
      )
      setReply('')
      return
    }

    setTickets((prev) =>
      prev.map((t) =>
        t.id !== activeId
          ? t
          : {
              ...t,
              messages: [...t.messages, { from: 'agent', text, time: now }],
              openedAt: t.openedAt ?? Date.now(),
            }
      )
    )
    setReply('')

    const ticket = tickets.find((t) => t.id === activeId)
    if (ticket.followUpIndex >= ticket.followUps.length) return

    const exchange = ticket.exchanges?.[ticket.followUpIndex]
    const relevant = isRelevant(text, exchange)
    const polite = hasManners(text, exchange)

    setTyping(true)
    setTimeout(() => {
      const replyTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

      if (relevant) {
        // Technically correct — advance, but optionally prepend/append a manners note
        setTickets((prev) =>
          prev.map((t) => {
            if (t.id !== activeId) return t
            const lowerText = text.toLowerCase()
            const branchKws = t.exchanges?.[t.followUpIndex]?.branchKeywords
            const useBranch = branchKws?.some((kw) => lowerText.includes(kw))
            const followUpText = useBranch
              ? (t.exchanges[t.followUpIndex].branchFollowUp ?? t.followUps[t.followUpIndex])
              : t.followUps[t.followUpIndex]
            let customerText = followUpText
            let hasRemark = false
            if (!polite && t.exchanges?.[t.followUpIndex]?.mannersRemark) {
              const remarks = t.exchanges[t.followUpIndex].mannersRemark
              const pick = remarks[Math.floor(Math.random() * remarks.length)]
              const pos = t.exchanges[t.followUpIndex].mannersPosition ?? 'before'
              customerText = pos === 'after'
                ? `${followUpText}\n\n${pick}`
                : `${pick}\n\n${followUpText}`
              hasRemark = true
            }
            return {
              ...t,
              messages: [
                ...t.messages,
                { from: 'customer', text: customerText, time: replyTime, _mannersRemark: hasRemark },
              ],
              followUpIndex: t.followUpIndex + 1,
            }
          })
        )
      } else {
        // Off-topic — customer pushes back, followUpIndex stays the same
        setTickets((prev) =>
          prev.map((t) => {
            if (t.id !== activeId) return t
            const confusions = t.exchanges?.[t.followUpIndex]?.confusion ?? []
            const usedCount = t.messages.filter(
              (m) => m.from === 'customer' && m._confusion && m._stage === t.followUpIndex
            ).length
            const pick = confusions[usedCount % confusions.length] ??
              "I'm sorry, that doesn't address my issue. Could you please focus on the specific problem I described?"
            return {
              ...t,
              messages: [
                ...t.messages,
                { from: 'customer', text: pick, time: replyTime, _confusion: true, _stage: t.followUpIndex },
              ],
            }
          })
        )
      }
      setTyping(false)
    }, 1800)
  }

  const resolveTicket = () => {
    const updated = tickets.map((t) =>
      t.id === activeId ? { ...t, status: 'resolved' } : t
    )
    setTickets(updated)

    const remaining = updated.filter((t) => t.status !== 'resolved')
    if (remaining.length === 0) {
      setDone(true)
    } else {
      setActiveId(remaining[0].id)
    }
  }

  const canResolve =
    active &&
    active.status !== 'resolved' &&
    active.assignedPriority !== null &&
    active.messages.length > 1 &&
    active.followUpIndex >= active.followUps.length

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!tickets) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  // ── Completion screen (first-time finish) ──────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-10 max-w-md w-full text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Simulation Complete!</h2>
          <p className="text-slate-400 text-sm mb-6">
            You successfully resolved all 4 tickets — Critical, High, Medium, and Low priority.
            Well done on applying a structured troubleshooting approach.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {tickets.map((t) => {
              const assigned = PRIORITY_META[t.assignedPriority ?? 'unassigned']
              const correct = PRIORITY_META[t.priority]
              const isCorrect = t.assignedPriority === t.priority
              return (
                <div key={t.id} className={clsx('rounded-xl p-3 border text-left', assigned.bg, assigned.border)}>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className={clsx('text-xs font-semibold', assigned.color)}>{assigned.label}</p>
                    {t.assignedPriority && (
                      isCorrect
                        ? <span className="text-xs text-emerald-400">✓</span>
                        : <span className="text-xs text-amber-400" title={`Expected: ${correct.label}`}>≠ {correct.label}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-tight truncate">{t.subject}</p>
                  <p className="text-xs text-emerald-400 mt-1">✓ Resolved</p>
                </div>
              )
            })}
          </div>
          <button onClick={() => navigate('/phase/1')} className="btn-primary w-full">
            Back to Phase 1
          </button>
        </div>
      </div>
    )
  }

  // ── Shared ticket browser (interactive + read-only) ────────────────────────
  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top bar */}
      <div className="bg-surface-1 border-b border-white/8 px-4 py-2.5 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate('/phase/1')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Simulation
        </button>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">Kayako</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-400">Support Queue</span>
        </div>

        {readOnly ? (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
            <Lock className="w-3 h-3" /> Simulation complete — read only
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <Inbox className="w-3.5 h-3.5" />
            {tickets.filter((t) => t.status === 'open').length} open
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Ticket list sidebar */}
        <div className="w-72 shrink-0 border-r border-white/8 overflow-y-auto bg-surface-1/50">
          <div className="p-3 border-b border-white/5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Tickets</p>
          </div>
          {tickets.map((t) => {
            const p = PRIORITY_META[t.assignedPriority ?? 'unassigned']
            const isActive = t.id === activeId
            return (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={clsx(
                  'w-full text-left px-4 py-3.5 border-b border-white/5 transition-all',
                  isActive ? 'bg-brand-500/10 border-l-2 border-l-brand-500' : 'hover:bg-white/3'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={clsx('w-2 h-2 rounded-full shrink-0', p.dot)} />
                  <span className="text-xs font-mono text-slate-500">{t.id}</span>
                  {t.status === 'resolved' && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />
                  )}
                </div>
                <p className="text-xs text-slate-300 font-medium leading-snug mb-1 line-clamp-2">{t.subject}</p>
                <div className="flex items-center gap-2">
                  <span className={clsx('text-xs', p.color)}>{p.label}</span>
                  <span className="text-slate-600 text-xs">·</span>
                  <span className="text-xs text-slate-500 truncate">{t.customer.name}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Conversation panel */}
        {active && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Ticket header */}
            <div className="bg-surface-1 border-b border-white/8 px-6 py-4 shrink-0">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-slate-500">{active.id}</span>
                    <span className={clsx('badge border text-xs', pm.bg, pm.color, pm.border)}>{pm.label}</span>
                    {active.status === 'resolved'
                      ? <span className="badge border text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Resolved</span>
                      : <span className="badge border text-xs bg-sky-500/15 text-sky-400 border-sky-500/30">Open</span>
                    }
                  </div>
                  <h2 className="text-base font-semibold text-white leading-snug">{active.subject}</h2>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span className="text-slate-400 font-medium">{active.customer.name}</span>
                  <span className="text-slate-600">({active.customer.email})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {active.createdAt}
                </div>
              </div>

              {/* Priority picker */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-slate-500 shrink-0">Priority:</span>
                {['critical', 'high', 'medium', 'low'].map((key) => {
                  const meta = PRIORITY_META[key]
                  const selected = active.assignedPriority === key
                  return (
                    <button
                      key={key}
                      disabled={readOnly || active.status === 'resolved'}
                      onClick={() => setPriority(active.id, key)}
                      className={clsx(
                        'text-xs px-2.5 py-1 rounded-md border transition-all font-medium',
                        selected
                          ? `${meta.bg} ${meta.border} ${meta.color}`
                          : 'bg-white/3 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300 disabled:cursor-default disabled:hover:border-white/10 disabled:hover:text-slate-500'
                      )}
                    >
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Messages */}
            <div ref={threadRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
              {active.messages.map((msg, i) => {
                const isAgent = msg.from === 'agent'
                // Find if the NEXT message (from customer) is a confusion reply, to mark this agent msg
                const nextMsg = active.messages[i + 1]
                const triggeredConfusion = isAgent && nextMsg?._confusion

                if (msg._hint) {
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 mt-0.5">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-amber-400">Hint</span>
                          <span className="text-xs text-slate-600">{msg.time}</span>
                        </div>
                        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-amber-100/85 leading-relaxed italic">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={i} className={clsx('flex gap-3', isAgent && 'flex-row-reverse')}>
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                      isAgent ? 'bg-brand-500 text-white' : 'bg-slate-600 text-slate-200'
                    )}>
                      {isAgent ? 'Me' : active.customer.name[0]}
                    </div>
                    <div className={clsx('max-w-[65%]', isAgent && 'items-end flex flex-col')}>
                      <div className={clsx('text-xs mb-1 flex items-center gap-2', isAgent ? 'justify-end text-slate-500' : 'text-slate-500')}>
                        <span className="font-medium text-slate-400">
                          {isAgent ? 'You (Support Agent)' : active.customer.name}
                        </span>
                        <span>{msg.time}</span>
                      </div>
                      <div className={clsx(
                        'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                        isAgent
                          ? triggeredConfusion
                            ? 'bg-amber-500/10 border border-amber-500/20 text-slate-300 rounded-tr-sm'
                            : 'bg-brand-500/20 text-slate-200 rounded-tr-sm'
                          : msg._confusion
                            ? 'bg-red-500/10 border border-red-500/20 text-slate-300 rounded-tl-sm'
                            : msg._mannersRemark
                            ? 'bg-amber-500/8 border border-amber-500/15 text-slate-300 rounded-tl-sm'
                            : 'bg-surface-3 text-slate-300 rounded-tl-sm'
                      )}>
                        {msg.text}
                      </div>
                      {triggeredConfusion && (
                        <p className="text-xs text-amber-400/70 mt-1 text-right">
                          Response didn't address the issue — try again
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Hint box — shown below the latest confusion message */}
              {(() => {
                const lastMsg = active.messages[active.messages.length - 1]
                if (!lastMsg?._confusion) return null
                const hint = active.exchanges?.[lastMsg._stage]?.hint
                if (!hint) return null
                return (
                  <div className="flex items-start gap-2 mx-2 text-xs text-sky-300/90 bg-sky-500/8 border border-sky-500/20 rounded-xl px-3.5 py-2.5">
                    <span className="shrink-0 mt-px">💡</span>
                    <span><span className="font-semibold text-sky-300">Hint:</span> {hint}</span>
                  </div>
                )
              })()}

              {typing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                    {active.customer.name[0]}
                  </div>
                  <div className="bg-surface-3 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {active.status === 'resolved' && (
                <div className="flex items-center gap-2 justify-center text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Ticket resolved
                </div>
              )}

              {canResolve && !typing && !readOnly && (
                <div className="flex items-center gap-2 justify-center text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4" />
                  The customer appears satisfied — you can resolve this ticket
                </div>
              )}

              {!canResolve && !active.assignedPriority && active.messages.length > 1 && active.followUpIndex >= active.followUps.length && !readOnly && active.status !== 'resolved' && (
                <div className="flex items-center gap-2 justify-center text-xs text-slate-400 bg-white/3 border border-white/10 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4" />
                  Assign a priority to this ticket before resolving
                </div>
              )}
            </div>

            {/* Reply box — hidden in read-only mode and for resolved tickets */}
            {!readOnly && active.status !== 'resolved' && (
              <div className="border-t border-white/8 py-4 pl-4 pr-6 bg-surface-1 shrink-0">
                <textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply() }}
                  placeholder="Type your reply to the customer… (Ctrl+Enter to send)"
                  className="input w-full resize-none text-sm mb-3"
                  disabled={typing}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">
                    {active.followUpIndex}/{active.followUps.length} customer replies received
                  </span>
                  <div className="flex gap-2 mr-16">
                    {canResolve && (
                      <button
                        onClick={resolveTicket}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Resolve Ticket
                      </button>
                    )}
                    <button
                      onClick={sendReply}
                      disabled={!reply.trim() || typing}
                      className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" /> Send Reply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
