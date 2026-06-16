import type { GardenLayout } from '../data/gardenLayouts'

/** Draws the cones, paths, goals and targets for a drill onto the flattened pitch. */
export default function GardenOverlay({ layout, w, h }: { layout: GardenLayout; w: number; h: number }) {
  const P = (p: { x: number; y: number }) => ({ x: p.x * w, y: p.y * h })
  const cone = Math.max(8, w * 0.03)

  return (
    <svg width={w} height={h} className="pointer-events-none absolute inset-0">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#1fd17a" />
        </marker>
      </defs>

      {/* Path */}
      {layout.path && (
        <polyline
          points={layout.path.map((p) => { const q = P(p); return `${q.x},${q.y}` }).join(' ')}
          fill="none"
          stroke="#1fd17a"
          strokeWidth={3}
          strokeDasharray="2 6"
          strokeLinecap="round"
          markerEnd="url(#arrow)"
          opacity={0.95}
        />
      )}

      {/* Goals */}
      {layout.goals?.map((g, i) => {
        const c = P({ x: g.x, y: g.y })
        const gw = g.w * w
        const gh = Math.max(10, h * 0.05)
        return (
          <rect key={i} x={c.x - gw / 2} y={c.y - gh / 2} width={gw} height={gh} rx={3} fill="rgba(255,255,255,0.12)" stroke="#fff" strokeWidth={2.5} />
        )
      })}

      {/* Targets */}
      {layout.targets?.map((t, i) => {
        const c = P(t)
        return (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={cone * 0.9} fill="none" stroke="#f4c95d" strokeWidth={2.5} />
            <circle cx={c.x} cy={c.y} r={cone * 0.35} fill="#f4c95d" />
          </g>
        )
      })}

      {/* Cones (gold triangles) */}
      {layout.cones.map((p, i) => {
        const c = P(p)
        return (
          <polygon
            key={i}
            points={`${c.x},${c.y - cone} ${c.x - cone * 0.8},${c.y + cone * 0.7} ${c.x + cone * 0.8},${c.y + cone * 0.7}`}
            fill="#f4c95d"
            stroke="#caa23f"
            strokeWidth={1.5}
          />
        )
      })}
    </svg>
  )
}
