import type { GardenLayout } from '../data/gardenLayouts'

// A faithful 2D top-down reproduction of Caiden's actual garden, drawn from
// the photos. House at the bottom, far hedge at the top. Real features in
// their real places: goal (left of centre), the big tree (mid-right), three
// washing-line poles across the middle, the swing + slide by the house, bins,
// the worn-grass strip down the pitch, and side fences. Drill cones / paths /
// goals are overlaid on top when a drill is selected.

const VW = 100
const VH = 150

export const GOAL_X = 0.38
const X = (x: number) => x * VW
const Y = (y: number) => y * VH

// Worn-earth patches (the well-used playing strip).
const WORN = [
  { cx: 44, cy: 40, rx: 9, ry: 12 },
  { cx: 50, cy: 62, rx: 11, ry: 14 },
  { cx: 46, cy: 84, rx: 10, ry: 13 },
  { cx: 53, cy: 104, rx: 9, ry: 12 },
  { cx: 40, cy: 120, rx: 8, ry: 9 },
]
// Soft grass mottle.
const MOTTLE = [
  { cx: 20, cy: 30, r: 10, c: '#3f8a45' },
  { cx: 78, cy: 95, r: 13, c: '#3f8a45' },
  { cx: 30, cy: 110, r: 9, c: '#52a657' },
  { cx: 70, cy: 30, r: 8, c: '#52a657' },
  { cx: 24, cy: 70, r: 7, c: '#3f8a45' },
]
const WASH_POLES = [
  { x: 18, y: 72 },
  { x: 50, y: 70 },
  { x: 82, y: 72 },
]

function Goal({ cx, top, w, depth = 7 }: { cx: number; top: number; w: number; depth?: number }) {
  const left = cx - w / 2
  return (
    <g>
      <rect x={left} y={top} width={w} height={depth} rx={1} fill="rgba(255,255,255,0.12)" stroke="#fff" strokeWidth={1.4} />
      {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
        <line key={i} x1={left + w * f} y1={top} x2={left + w * f} y2={top + depth} stroke="rgba(255,255,255,0.5)" strokeWidth={0.4} />
      ))}
    </g>
  )
}

export default function GardenPitch({ layout, className }: { layout?: GardenLayout; className?: string }) {
  const cone = 3
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="pitchArrow" markerWidth="5" markerHeight="5" refX="3.5" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#1fd17a" />
        </marker>
        <radialGradient id="treeGrad" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#4caf50" />
          <stop offset="100%" stopColor="#1b5e2a" />
        </radialGradient>
      </defs>

      {/* Lawn */}
      <rect x={0} y={0} width={VW} height={VH} fill="#43924a" />
      {MOTTLE.map((m, i) => (
        <circle key={i} cx={m.cx} cy={m.cy} r={m.r} fill={m.c} opacity={0.5} />
      ))}
      {WORN.map((w, i) => (
        <ellipse key={i} cx={w.cx} cy={w.cy} rx={w.rx} ry={w.ry} fill="#b59a6b" opacity={0.55} />
      ))}

      {/* Far hedge / boundary (top) */}
      <rect x={0} y={0} width={VW} height={8} fill="#1c5a2c" />
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx={(i + 0.5) * (VW / 14)} cy={8} r={3.4} fill="#23692f" />
      ))}

      {/* Side fences */}
      <g>
        <rect x={1.5} y={6} width={3} height={VH - 8} fill="#b58a4e" />
        <rect x={VW - 4.5} y={6} width={3} height={VH - 8} fill="#6f5430" />
        {Array.from({ length: 18 }).map((_, i) => (
          <g key={i}>
            <line x1={1.5} y1={6 + i * 8} x2={4.5} y2={6 + i * 8} stroke="rgba(0,0,0,0.25)" strokeWidth={0.4} />
            <line x1={VW - 4.5} y1={6 + i * 8} x2={VW - 1.5} y2={6 + i * 8} stroke="rgba(0,0,0,0.3)" strokeWidth={0.4} />
          </g>
        ))}
      </g>

      {/* Permanent goal (left of centre, facing down the garden) */}
      <Goal cx={X(GOAL_X)} top={12} w={28} />

      {/* Washing line: three poles across the middle, line strung between */}
      <g>
        <polyline points={WASH_POLES.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={0.5} strokeDasharray="1.5 1.5" />
        {WASH_POLES.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.6} fill="#cfd6d2" stroke="#0c2e1a" strokeWidth={0.5} />
        ))}
      </g>

      {/* The tree (mid-right, leafy) */}
      <g>
        <ellipse cx={68} cy={56} rx={3} ry={2} fill="rgba(0,0,0,0.18)" />
        <circle cx={66} cy={52} r={15} fill="url(#treeGrad)" stroke="#15431f" strokeWidth={0.8} />
        <circle cx={61} cy={48} r={6} fill="#5cb860" opacity={0.5} />
        <circle cx={66} cy={52} r={2.2} fill="#5b3b1a" />
      </g>

      {/* Wheelie bin by the right fence (mid) */}
      <rect x={86} y={86} width={6} height={8} rx={1} fill="#7a4a22" stroke="#3a230f" strokeWidth={0.4} />

      {/* Play area near the house: swing frame + green slide */}
      <g>
        {/* Swing A-frame */}
        <rect x={12} y={120} width={28} height={16} rx={1.5} fill="none" stroke="#8a5a2c" strokeWidth={1.6} />
        <line x1={12} y1={128} x2={40} y2={128} stroke="#8a5a2c" strokeWidth={1.6} />
        <rect x={18} y={124} width={4} height={4} rx={0.6} fill="#2b6cb0" />
        <rect x={30} y={124} width={4} height={4} rx={0.6} fill="#2b6cb0" />
        {/* Green slide */}
        <polygon points="6,122 11,122 9,138 5,138" fill="#3fae4a" stroke="#1f6e28" strokeWidth={0.5} />
        <rect x={5} y={120} width={6} height={4} rx={1} fill="#2f8a38" />
      </g>

      {/* Patio + house wall (bottom) */}
      <rect x={0} y={138} width={VW} height={5} fill="#9aa0a2" />
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1={(i + 1) * (VW / 8)} y1={138} x2={(i + 1) * (VW / 8)} y2={143} stroke="rgba(0,0,0,0.18)" strokeWidth={0.4} />
      ))}
      <rect x={0} y={143} width={VW} height={7} fill="#cabfb1" />
      <rect x={44} y={143} width={8} height={7} fill="#5a4632" />{/* door */}
      <rect x={20} y={144.5} width={9} height={4} fill="#9fb6c4" />{/* window */}
      <rect x={66} y={144.5} width={9} height={4} fill="#9fb6c4" />{/* window */}
      {/* Bins by the door */}
      <rect x={56} y={139} width={5} height={4} rx={0.8} fill="#6f4422" />
      <rect x={62} y={139} width={5} height={4} rx={0.8} fill="#2f6f3a" />

      {/* ---------- Drill overlay ---------- */}
      {layout && (
        <g>
          {layout.path && (
            <polyline
              points={layout.path.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}
              fill="none"
              stroke="#eafff3"
              strokeWidth={2}
              strokeDasharray="1.5 3"
              strokeLinecap="round"
              markerEnd="url(#pitchArrow)"
              style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}
            />
          )}
          {layout.goals?.map((g, i) => <Goal key={i} cx={X(g.x)} top={Y(g.y)} w={g.w * VW} />)}
          {layout.targets?.map((t, i) => (
            <g key={i}>
              <circle cx={X(t.x)} cy={Y(t.y)} r={cone} fill="none" stroke="#f4c95d" strokeWidth={1.4} />
              <circle cx={X(t.x)} cy={Y(t.y)} r={cone * 0.4} fill="#f4c95d" />
            </g>
          ))}
          {layout.cones.map((p, i) => (
            <polygon
              key={i}
              points={`${X(p.x)},${Y(p.y) - cone} ${X(p.x) - cone * 0.85},${Y(p.y) + cone * 0.75} ${X(p.x) + cone * 0.85},${Y(p.y) + cone * 0.75}`}
              fill="#f4c95d"
              stroke="#9a7b22"
              strokeWidth={0.6}
              style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
