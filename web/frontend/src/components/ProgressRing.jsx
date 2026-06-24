export default function ProgressRing({ value, max, size = 80, stroke = 6, color = '#6366f1' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = max === 0 ? 0 : Math.min(value / max, 1)
  const dash = pct * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}
