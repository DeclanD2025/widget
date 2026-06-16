interface Props {
  /** 0..1 fraction remaining. */
  fraction: number
  label: string
  sub?: string
  size?: number
}

/** Big countdown ring for the drill timer. */
export default function ProgressRing({ fraction, label, sub, size = 240 }: Props) {
  const stroke = 16
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(1, fraction)))

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#22c55e"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-6xl font-extrabold tabular-nums">{label}</div>
        {sub ? <div className="mt-1 text-sm font-semibold text-white/60">{sub}</div> : null}
      </div>
    </div>
  )
}
