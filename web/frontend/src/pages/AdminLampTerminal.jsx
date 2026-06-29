import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
  ArrowLeft, Terminal as TerminalIcon, Loader2, RefreshCw,
  Circle, AlertCircle, CheckCircle2, ShieldCheck
} from 'lucide-react'

const STATUS_LABEL = {
  running:   { label: 'Running',     dot: 'bg-emerald-400', text: 'text-emerald-400' },
  starting:  { label: 'Starting…',   dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400' },
  stopped:   { label: 'Stopped',     dot: 'bg-slate-500', text: 'text-slate-400' },
  not_found: { label: 'Not created', dot: 'bg-slate-600', text: 'text-slate-500' },
  error:     { label: 'Error',       dot: 'bg-red-400', text: 'text-red-400' },
}

export default function AdminLampTerminal() {
  const navigate = useNavigate()
  const { userId } = useParams()

  const termRef = useRef(null)
  const xtermRef = useRef(null)
  const fitAddonRef = useRef(null)
  const wsRef = useRef(null)
  const onDataDisposableRef = useRef(null)

  const [containerStatus, setContainerStatus] = useState('starting')
  const [wsConnected, setWsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState(null)

  // ── Initialize xterm ──────────────────────────────────────────────────────
  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      theme: {
        background: '#0f1117',
        foreground: '#e2e8f0',
        cursor: '#7c86f5',
        selectionBackground: '#7c86f5',
        black: '#1e2030',
        red: '#f87171',
        green: '#34d399',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#a78bfa',
        cyan: '#22d3ee',
        white: '#cbd5e1',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#c4b5fd',
        brightCyan: '#67e8f9',
        brightWhite: '#f1f5f9',
      },
      scrollback: 5000,
      allowTransparency: false,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    fitAddonRef.current = fitAddon

    if (termRef.current) {
      term.open(termRef.current)
    }

    xtermRef.current = term

    const sendResize = () => {
      fitAddon.fit()
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }))
      }
    }

    document.fonts.ready.then(() => requestAnimationFrame(sendResize))

    const ro = new ResizeObserver(() => requestAnimationFrame(sendResize))
    if (termRef.current) ro.observe(termRef.current)

    return () => {
      ro.disconnect()
      term.dispose()
    }
  }, [])

  // ── Fetch username for display ─────────────────────────────────────────────
  useEffect(() => {
    api.get(`/admin/users/${userId}`)
      .then((d) => setUsername(d.username))
      .catch(() => {})
  }, [userId])

  // ── Connect to admin terminal WebSocket ───────────────────────────────────
  const connect = useCallback(async () => {
    setError(null)
    setContainerStatus('starting')
    setWsConnected(false)

    try {
      const result = await api.get(`/containers/admin/${userId}/lamp`)
      setContainerStatus(result.status === 'running' ? 'running' : 'starting')
    } catch {
      setError('Failed to reach container. User may not have started Phase 2 yet.')
      setContainerStatus('not_found')
      return
    }

    const token = localStorage.getItem('token')
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    const ws = new WebSocket(
      `${proto}://${host}/api/containers/admin/${userId}/lamp/terminal?token=${token}`
    )
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    const term = xtermRef.current
    const fitAddon = fitAddonRef.current

    ws.onopen = () => {
      setWsConnected(true)
      setContainerStatus('running')
      term.clear()
      document.fonts.ready.then(() => {
        fitAddon.fit()
        ws.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }))
        term.focus()
      })
    }

    ws.onmessage = (evt) => {
      const data = evt.data instanceof ArrayBuffer ? new Uint8Array(evt.data) : evt.data
      term.write(data)
    }

    ws.onclose = () => {
      setWsConnected(false)
      term.write('\r\n\x1b[31m— Connection closed —\x1b[0m\r\n')
    }

    ws.onerror = () => {
      setError('WebSocket connection failed.')
      setWsConnected(false)
    }

    onDataDisposableRef.current?.dispose()
    onDataDisposableRef.current = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(new TextEncoder().encode(data))
      }
    })
  }, [userId])

  useEffect(() => {
    connect()
    return () => { wsRef.current?.close() }
  }, [connect])

  const reconnect = () => {
    wsRef.current?.close()
    xtermRef.current?.clear()
    connect()
  }

  const sm = STATUS_LABEL[containerStatus] ?? STATUS_LABEL.error

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#0f1117] relative">
      {/* Top bar */}
      <div className="bg-surface-1 border-b border-white/8 px-4 py-2.5 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </button>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono text-slate-300">LAMP Lab</span>
          {username && (
            <>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-brand-400 font-medium">{username}</span>
            </>
          )}
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500">Admin View</span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sm.dot}`} />
            <span className={`text-xs ${sm.text}`}>{sm.label}</span>
          </div>
          {wsConnected ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-500/10 border border-slate-500/20 rounded-lg px-2.5 py-1">
              <Circle className="w-3 h-3" /> Disconnected
            </div>
          )}
          <button
            onClick={reconnect}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            title="Reconnect"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {containerStatus === 'starting' && !wsConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1117]/90 z-10 gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-slate-300 text-sm">Connecting to container…</p>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-1">
        <div ref={termRef} className="w-full h-full" />
      </div>
    </div>
  )
}
