import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
  ArrowLeft, Terminal as TerminalIcon, Loader2, RefreshCw,
  Circle, AlertCircle, CheckCircle2
} from 'lucide-react'

const STATUS_LABEL = {
  running:   { label: 'Running',     dot: 'bg-emerald-400', text: 'text-emerald-400' },
  starting:  { label: 'Starting…',   dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400' },
  stopped:   { label: 'Stopped',     dot: 'bg-slate-500', text: 'text-slate-400' },
  not_found: { label: 'Not created', dot: 'bg-slate-600', text: 'text-slate-500' },
  error:     { label: 'Error',       dot: 'bg-red-400', text: 'text-red-400' },
}

export default function LampLab() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const termRef = useRef(null)
  const xtermRef = useRef(null)
  const fitAddonRef = useRef(null)
  const wsRef = useRef(null)
  const onDataDisposableRef = useRef(null)

  const [containerStatus, setContainerStatus] = useState('starting')
  const [wsConnected, setWsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [phaseCompleted, setPhaseCompleted] = useState(false)

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
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          rows: term.rows,
          cols: term.cols,
        }))
      }
    }

    // Wait for web fonts before measuring character dimensions
    document.fonts.ready.then(() => requestAnimationFrame(sendResize))

    const ro = new ResizeObserver(() => requestAnimationFrame(sendResize))
    if (termRef.current) ro.observe(termRef.current)

    return () => {
      ro.disconnect()
      term.dispose()
    }
  }, [])

  // ── Start container then open WebSocket ───────────────────────────────────
  const connect = useCallback(async () => {
    setError(null)
    setContainerStatus('starting')
    setWsConnected(false)

    try {
      await api.post('/containers/lamp')
      setContainerStatus('running')
    } catch (err) {
      if (err.message === 'phase_completed') {
        setPhaseCompleted(true)
        setContainerStatus('stopped')
        return
      }
      setError('Failed to start container. Is Docker running?')
      setContainerStatus('error')
      return
    }

    const term = xtermRef.current
    const fitAddon = fitAddonRef.current

    // Compute dimensions before opening WS so backend can size the PTY from the start
    await document.fonts.ready
    fitAddon.fit()
    const initCols = term.cols || 80
    const initRows = term.rows || 24

    const token = localStorage.getItem('token')
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    const ws = new WebSocket(
      `${proto}://${host}/api/containers/lamp/terminal?token=${token}&cols=${initCols}&rows=${initRows}`
    )
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      term.clear()
      term.focus()
      // Re-fit in case layout changed while WS was connecting
      requestAnimationFrame(() => {
        fitAddon.fit()
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }))
        }
      })
    }

    ws.onmessage = (evt) => {
      const data = evt.data instanceof ArrayBuffer
        ? new Uint8Array(evt.data)
        : evt.data
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

    // Dispose any previous listener before registering a new one
    onDataDisposableRef.current?.dispose()
    onDataDisposableRef.current = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(new TextEncoder().encode(data))
      }
    })
  }, [])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
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
          onClick={() => navigate('/phase/2')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Lab
        </button>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono text-slate-300">LAMP Lab</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500">Ubuntu 24.04</span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {/* Container status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sm.dot}`} />
            <span className={`text-xs ${sm.text}`}>{sm.label}</span>
          </div>

          {/* WebSocket status */}
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

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Phase completed overlay */}
      {phaseCompleted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1117]/90 z-10 gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          <p className="text-slate-200 text-sm font-semibold">Phase 2 Completed</p>
          <p className="text-slate-500 text-xs text-center max-w-xs">Your lab has been reviewed and closed.<br />Contact your admin if you need access restored.</p>
        </div>
      )}

      {/* Loading overlay */}
      {!phaseCompleted && containerStatus === 'starting' && !wsConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1117]/90 z-10 gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-slate-300 text-sm">Starting your LAMP container…</p>
          <p className="text-slate-500 text-xs">Ubuntu 24.04 · First launch may take a few seconds</p>
        </div>
      )}

      {/* xterm.js terminal */}
      <div className="flex-1 overflow-hidden p-1">
        <div ref={termRef} className="w-full h-full" />
      </div>
    </div>
  )
}
