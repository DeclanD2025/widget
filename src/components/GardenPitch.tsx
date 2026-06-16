import type { GardenLayout } from '../data/gardenLayouts'

// A stylised 2D bird's-eye of Caiden's actual garden. Proportions and fixed
// features (side fences, the tree, the goal end, the play area at the house
// end) are baked in from the garden photos — no setup needed. Drill cones,
// paths, goals and targets are drawn on top automatically.

const VW = 100
const VH = 150

// Baked garden features (normalised 0..1; y=0 is the far end, y=1 the house).
const FENCE_L = 0.06
const FENCE_R = 0.94
const TREE = { x: 0.66, y: 0.4, r: 0.12 }
const PLAY_AREA = { top: 0.82 }
// The goal sits left of centre, matching the real garden.
export const GOAL_X = 0.38
const PERM_GOAL = { x: GOAL_X, y: 0.05, w: 0.3 }
// Three washing-line poles down the right side.
const WASHING_POLES = [
  { x: 0.8, y: 0.34 },
  { x: 0.8, y: 0.52 },
  { x: 0.8, y: 0.7 },
]

const X = (x: number) => x * VW
const Y = (y: number) => y * VH

function Goal({ x, y, w }: { x: number; y: number; w: number }) {
  const left = X(x - w / 2)
  const right = X(x + w / 2)
  const top = Y(y)
  const depth = 6
  const posts = [0.25, 0.5, 0.75].map((f) => left + (right - left) * f)
  return (
    <g>
      <rect x={left} y={top} width={right - left} height={depth} rx={1} fill="rgba(255,255,255,0.1)" stroke="#fff" strokeWidth={1.4} />
      {posts.map((px, i) => (
        <line key={i} x1={px} y1={top} x2={px} y2={top + depth} stroke="rgba(255,255,255,0.55)" strokeWidth={0.5} />
      ))}
    </g>
  )
}

export default function GardenPitch({ layout, className }: { layout?: GardenLayout; className?: string }) {
  const stripes = Array.from({ length: 9 })
  const cone = 3
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="pitchArrow" markerWidth="5" markerHeight="5" refX="3.5" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#1fd17a" />
        </marker>
        <pattern id="playHatch" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Lawn + mowing stripes */}
      <rect x={0} y={0} width={VW} height={VH} fill="#0f3d24" />
      {stripes.map((_, i) => (
        <rect key={i} x={0} y={(i * VH) / stripes.length} width={VW} height={VH / stripes.length} fill={i % 2 ? '#134e2e' : '#0f3d24'} />
      ))}
      <rect x={0.6} y={0.6} width={VW - 1.2} height={VH - 1.2} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} rx={2} />

      {/* Side fences */}
      {[FENCE_L, FENCE_R].map((fx, i) => (
        <line key={i} x1={X(fx)} y1={2} x2={X(fx)} y2={VH - 2} stroke="#8a6a3a" strokeWidth={2.4} strokeDasharray="3 1.5" strokeLinecap="round" opacity={0.8} />
      ))}

      {/* Play area (swing & slide) at the house end */}
      <rect x={X(FENCE_L)} y={Y(PLAY_AREA.top)} width={X(FENCE_R) - X(FENCE_L)} height={VH - Y(PLAY_AREA.top) - 2} fill="url(#playHatch)" stroke="rgba(255,255,255,0.18)" strokeWidth={0.8} rx={2} />
      <text x={VW / 2} y={Y(PLAY_AREA.top) + 9} textAnchor="middle" fontFamily="'Saira Condensed',sans-serif" fontSize="5" letterSpacing="0.5" fill="rgba(255,255,255,0.45)">PLAY AREA</text>

      {/* Washing line: three poles down the right, joined by the line */}
      <g>
        <polyline
          points={WASHING_POLES.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={0.5}
          strokeDasharray="1 1"
        />
        {WASHING_POLES.map((p, i) => (
          <g key={i}>
            <circle cx={X(p.x)} cy={Y(p.y)} r={1.8} fill="#d4dbd7" stroke="#0c2e1a" strokeWidth={0.6} />
            <circle cx={X(p.x)} cy={Y(p.y)} r={0.6} fill="#0c2e1a" />
          </g>
        ))}
        <text x={X(WASHING_POLES[0].x)} y={Y(WASHING_POLES[0].y) - 3.5} textAnchor="middle" fontFamily="'Saira Condensed',sans-serif" fontSize="3.4" letterSpacing="0.5" fill="rgba(255,255,255,0.4)">WASHING LINE</text>
      </g>

      {/* The tree (obstacle) */}
      <g>
        <circle cx={X(TREE.x)} cy={Y(TREE.y)} r={TREE.r * VW} fill="#1f7a3f" stroke="#0c2e1a" strokeWidth={1.2} opacity={0.94} />
        <circle cx={X(TREE.x)} cy={Y(TREE.y)} r={2.2} fill="#5b3b1a" />
        <text x={X(TREE.x)} y={Y(TREE.y) + TREE.r * VW + 4} textAnchor="middle" fontFamily="'Saira Condensed',sans-serif" fontSize="3.4" letterSpacing="0.5" fill="rgba(255,255,255,0.4)">TREE</text>
      </g>

      {/* End labels */}
      <text x={VW / 2} y={VH - 2.5} textAnchor="middle" fontFamily="'Saira Condensed',sans-serif" fontSize="4.5" letterSpacing="1" fill="rgba(255,255,255,0.35)">HOUSE END</text>

      {/* Permanent goal at the far end */}
      <Goal x={PERM_GOAL.x} y={PERM_GOAL.y} w={PERM_GOAL.w} />

      {/* ---------- Drill overlay ---------- */}
      {layout && (
        <g>
          {layout.path && (
            <polyline
              points={layout.path.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}
              fill="none"
              stroke="#1fd17a"
              strokeWidth={1.4}
              strokeDasharray="1 3"
              strokeLinecap="round"
              markerEnd="url(#pitchArrow)"
            />
          )}
          {layout.goals?.map((g, i) => <Goal key={i} x={g.x} y={g.y} w={g.w} />)}
          {layout.targets?.map((t, i) => (
            <g key={i}>
              <circle cx={X(t.x)} cy={Y(t.y)} r={cone} fill="none" stroke="#f4c95d" strokeWidth={1.2} />
              <circle cx={X(t.x)} cy={Y(t.y)} r={cone * 0.4} fill="#f4c95d" />
            </g>
          ))}
          {layout.cones.map((p, i) => (
            <polygon
              key={i}
              points={`${X(p.x)},${Y(p.y) - cone} ${X(p.x) - cone * 0.85},${Y(p.y) + cone * 0.75} ${X(p.x) + cone * 0.85},${Y(p.y) + cone * 0.75}`}
              fill="#f4c95d"
              stroke="#caa23f"
              strokeWidth={0.6}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
