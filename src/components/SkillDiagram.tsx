import type { SkillDiagramSpec } from '../data/howto'

// Simple football for the "strike" diagram (face-on view).
function Ball({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#f4f7f5" stroke="#0c130f" strokeWidth={2} />
      <polygon
        points={[0, 1, 2, 3, 4]
          .map((i) => {
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
            return `${cx + r * 0.34 * Math.cos(a)},${cy + r * 0.34 * Math.sin(a)}`
          })
          .join(' ')}
        fill="#0c130f"
      />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + Math.PI / 5
        return <line key={i} x1={cx} y1={cy} x2={cx + r * 0.9 * Math.cos(a)} y2={cy + r * 0.9 * Math.sin(a)} stroke="#0c130f" strokeWidth={0.8} opacity={0.4} />
      })}
    </g>
  )
}

function flightPath(flight: string): string {
  switch (flight) {
    case 'wobble':
      return 'M130,98 L150,80 L143,72 L165,58 L158,50 L195,28'
    case 'curl-r':
      return 'M130,98 Q140,40 200,30'
    case 'curl-l':
      return 'M130,98 Q205,70 196,26'
    case 'dip':
      return 'M130,98 Q160,8 200,60'
    default:
      return 'M130,98 L198,30' // straight
  }
}

export default function SkillDiagram({ spec, className }: { spec: SkillDiagramSpec; className?: string }) {
  if (spec.kind === 'strike') {
    const r = 34
    const bx = 62
    const by = 62
    const cx = bx + (spec.contact.x - 0.5) * 2 * (r - 4)
    const cy = by + (spec.contact.y - 0.5) * 2 * (r - 4)
    return (
      <svg viewBox="0 0 220 130" className={className}>
        <defs>
          <marker id="skArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#1fd17a" />
          </marker>
        </defs>
        <text x={62} y={14} textAnchor="middle" className="num" fontSize="11" fill="#9fb0a6">STRIKE HERE</text>
        <Ball cx={bx} cy={by} r={r} />
        <circle cx={cx} cy={cy} r={6} fill="none" stroke="#1fd17a" strokeWidth={2.5} />
        <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} stroke="#1fd17a" strokeWidth={1.2} />
        <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} stroke="#1fd17a" strokeWidth={1.2} />

        <text x={168} y={14} textAnchor="middle" className="num" fontSize="11" fill="#9fb0a6">FLIGHT</text>
        <path d={flightPath(spec.flight)} fill="none" stroke="#1fd17a" strokeWidth={2.5} markerEnd="url(#skArrow)" />
        <circle cx={130} cy={98} r={4} fill="#f4f7f5" stroke="#0c130f" strokeWidth={1.5} />
      </svg>
    )
  }

  // move diagram: ball + numbered arrows
  const bx = 110
  const by = 92
  return (
    <svg viewBox="0 0 220 150" className={className}>
      <defs>
        <marker id="mvArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#f4c95d" />
        </marker>
      </defs>
      {/* feet hint */}
      <ellipse cx={86} cy={128} rx={9} ry={14} fill="#1f2a24" stroke="#3a4a40" strokeWidth={1} />
      <ellipse cx={134} cy={128} rx={9} ry={14} fill="#1f2a24" stroke="#3a4a40" strokeWidth={1} />
      <Ball cx={bx} cy={by} r={20} />
      {spec.arrows.map((a, i) => {
        const x1 = a.x1 * 220
        const y1 = a.y1 * 150
        const x2 = a.x2 * 220
        const y2 = a.y2 * 150
        const mx = (x1 + x2) / 2 + (a.curve ?? 0) * 60
        const my = (y1 + y2) / 2 - Math.abs(a.curve ?? 0) * 40
        return (
          <g key={i}>
            <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} fill="none" stroke="#f4c95d" strokeWidth={2.5} strokeDasharray={a.dashed ? '4 3' : undefined} markerEnd="url(#mvArrow)" />
            <circle cx={x1} cy={y1} r={7} fill="#f4c95d" />
            <text x={x1} y={y1 + 3.5} textAnchor="middle" className="num" fontSize="10" fontWeight="700" fill="#0c130f">{i + 1}</text>
          </g>
        )
      })}
    </svg>
  )
}
