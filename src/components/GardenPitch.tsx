import type { GardenLayout } from '../data/gardenLayouts'

// The garden is the real top-down drone photo; drill cones / paths / goals are
// overlaid on it. The overlay coordinate space is normalised 0..1 and maps to
// the photo (which is 2:3, matching this 100x150 viewBox).

const VW = 100
const VH = 150
const X = (x: number) => x * VW
const Y = (y: number) => y * VH

const GARDEN_IMG = '/garden-aerial.png'

function GoalMark({ cx, top, w, depth = 6 }: { cx: number; top: number; w: number; depth?: number }) {
  const left = cx - w / 2
  return (
    <g style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}>
      <rect x={left} y={top} width={w} height={depth} rx={1} fill="rgba(31,209,122,0.18)" stroke="#eafff3" strokeWidth={1.4} />
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line key={i} x1={left + w * f} y1={top} x2={left + w * f} y2={top + depth} stroke="rgba(234,255,243,0.6)" strokeWidth={0.4} />
      ))}
    </g>
  )
}

export default function GardenPitch({ layout, className }: { layout?: GardenLayout; className?: string }) {
  const cone = 3
  return (
    <div className={className} style={{ aspectRatio: '2 / 3' }}>
      <div className="relative h-full w-full overflow-hidden rounded-xl">
        <img src={GARDEN_IMG} alt="Caiden's garden from above" className="absolute inset-0 h-full w-full object-cover" />
        {layout && (
          <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <defs>
              <marker id="pitchArrow" markerWidth="5" markerHeight="5" refX="3.5" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" fill="#eafff3" />
              </marker>
            </defs>

            {layout.path && (
              <polyline
                points={layout.path.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}
                fill="none"
                stroke="#eafff3"
                strokeWidth={2}
                strokeDasharray="1.5 3"
                strokeLinecap="round"
                markerEnd="url(#pitchArrow)"
                style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.7))' }}
              />
            )}

            {layout.goals?.map((g, i) => <GoalMark key={i} cx={X(g.x)} top={Y(g.y)} w={g.w * VW} />)}

            {layout.targets?.map((t, i) => (
              <g key={i} style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}>
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
                style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  )
}
