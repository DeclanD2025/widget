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
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#46e79a" />
            <stop offset="100%" stopColor="#1fd17a" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 6px rgba(31,209,122,0.5))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="num text-7xl font-extrabold">{label}</div>
        {sub ? <div className="mt-1 text-sm font-semibold text-white/55">{sub}</div> : null}
      </div>
    </div>
  )
}
