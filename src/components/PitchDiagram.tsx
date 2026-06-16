import type { PitchDiagramSpec } from '../data/tactics'

const W = 300
const H = 190

// A horizontal football pitch with positioned players, arrows and lines.
export default function PitchDiagram({ spec, className }: { spec: PitchDiagramSpec; className?: string }) {
  const X = (x: number) => x * W
  const Y = (y: number) => y * H
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className}>
      <defs>
        <marker id="pdArrow" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#eafff3" />
        </marker>
      </defs>

      {/* Pitch */}
      <rect x={0} y={0} width={W} height={H} rx={6} fill="#1f7a3f" />
      <rect x={0} y={0} width={W} height={H / 9} fill="#1c7138" />
      <rect x={0} y={(2 * H) / 9} width={W} height={H / 9} fill="#1c7138" />
      <rect x={0} y={(4 * H) / 9} width={W} height={H / 9} fill="#1c7138" />
      <rect x={0} y={(6 * H) / 9} width={W} height={H / 9} fill="#1c7138" />
      <rect x={0} y={(8 * H) / 9} width={W} height={H / 9} fill="#1c7138" />
      <g stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} fill="none">
        <rect x={4} y={4} width={W - 8} height={H - 8} rx={4} />
        <line x1={W / 2} y1={4} x2={W / 2} y2={H - 4} />
        <circle cx={W / 2} cy={H / 2} r={22} />
        <rect x={4} y={H / 2 - 38} width={42} height={76} />
        <rect x={W - 46} y={H / 2 - 38} width={42} height={76} />
        <rect x={0} y={H / 2 - 18} width={5} height={36} />
        <rect x={W - 5} y={H / 2 - 18} width={5} height={36} />
      </g>

      {/* Vertical reference lines (offside / block lines) */}
      {spec.vlines?.map((l, i) => (
        <g key={i}>
          <line x1={X(l.x)} y1={6} x2={X(l.x)} y2={H - 6} stroke={l.color ?? '#f4c95d'} strokeWidth={2} strokeDasharray="5 4" />
          {l.label && <text x={X(l.x)} y={16} textAnchor="middle" className="num" fontSize="10" fill={l.color ?? '#f4c95d'}>{l.label}</text>}
        </g>
      ))}

      {/* Arrows */}
      {spec.arrows?.map((a, i) => (
        <line key={i} x1={X(a.x1)} y1={Y(a.y1)} x2={X(a.x2)} y2={Y(a.y2)} stroke={a.color ?? '#eafff3'} strokeWidth={2.4} strokeDasharray={a.dashed ? '4 3' : undefined} markerEnd="url(#pdArrow)" />
      ))}

      {/* Players */}
      {spec.players.map((p, i) => {
        const fill = p.team === 'a' ? '#1fd17a' : '#e8edea'
        const ring = p.highlight === 'good' ? '#1fd17a' : p.highlight === 'bad' ? '#f87171' : undefined
        return (
          <g key={i}>
            {ring && <circle cx={X(p.x)} cy={Y(p.y)} r={9} fill="none" stroke={ring} strokeWidth={2.5} />}
            <circle cx={X(p.x)} cy={Y(p.y)} r={6} fill={fill} stroke="#0c130f" strokeWidth={1} />
            {p.label && <text x={X(p.x)} y={Y(p.y) + 2.8} textAnchor="middle" className="num" fontSize="8" fontWeight="700" fill="#0c130f">{p.label}</text>}
          </g>
        )
      })}

      {/* Ball */}
      {spec.ball && (
        <circle cx={X(spec.ball.x)} cy={Y(spec.ball.y)} r={4} fill="#fff" stroke="#0c130f" strokeWidth={1.2} />
      )}
    </svg>
  )
}
