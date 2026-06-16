// Drill overlays positioned on the real aerial garden photo. Coordinates are
// normalised 0..1: x = left→right, y = far end (goal, top) → house (bottom).
// Calibrated to the photo: goal is top, left of centre (~x0.36); the worn
// playing strip runs down ~x0.42; the tree sits mid-right (avoid ~x0.5-0.74,
// y0.20-0.43); usable lawn is roughly x0.18-0.78, y0.10-0.78.

export interface LayoutPoint {
  x: number
  y: number
}

export interface GardenLayout {
  cones: LayoutPoint[]
  path?: LayoutPoint[]
  goals?: { x: number; y: number; w: number }[]
  targets?: LayoutPoint[]
  tip: string
}

export const GARDEN_LAYOUTS: Record<string, GardenLayout> = {
  'cone-slalom': {
    cones: [
      { x: 0.42, y: 0.18 },
      { x: 0.42, y: 0.3 },
      { x: 0.42, y: 0.42 },
      { x: 0.42, y: 0.54 },
      { x: 0.42, y: 0.66 },
    ],
    path: [
      { x: 0.42, y: 0.74 },
      { x: 0.33, y: 0.66 },
      { x: 0.47, y: 0.54 },
      { x: 0.33, y: 0.42 },
      { x: 0.47, y: 0.3 },
      { x: 0.42, y: 0.14 },
    ],
    tip: 'Weave through the cones with small touches, then sprint back.',
  },
  'gate-dribbles': {
    cones: [
      { x: 0.36, y: 0.5 },
      { x: 0.48, y: 0.5 },
    ],
    path: [
      { x: 0.42, y: 0.72 },
      { x: 0.42, y: 0.5 },
      { x: 0.4, y: 0.2 },
    ],
    tip: 'Dribble through the gate, turn, and come back through.',
  },
  'shuttle-sprints': {
    cones: [
      { x: 0.42, y: 0.18 },
      { x: 0.42, y: 0.72 },
    ],
    path: [
      { x: 0.42, y: 0.72 },
      { x: 0.42, y: 0.18 },
    ],
    tip: 'Sprint cone to cone and back — that is one rep.',
  },
  'close-control-box': {
    cones: [
      { x: 0.32, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.68 },
      { x: 0.32, y: 0.68 },
    ],
    path: [
      { x: 0.32, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.68 },
      { x: 0.32, y: 0.68 },
      { x: 0.32, y: 0.5 },
    ],
    tip: 'Dribble around the square with tiny touches. Count your laps.',
  },
  'target-shooting': {
    cones: [],
    targets: [
      { x: 0.27, y: 0.07 },
      { x: 0.45, y: 0.07 },
    ],
    path: [
      { x: 0.4, y: 0.7 },
      { x: 0.37, y: 0.16 },
    ],
    tip: 'Aim for the cones in the corners of the goal.',
  },
  'shoot-after-dribble': {
    cones: [
      { x: 0.42, y: 0.66 },
      { x: 0.42, y: 0.52 },
      { x: 0.4, y: 0.4 },
    ],
    path: [
      { x: 0.42, y: 0.76 },
      { x: 0.34, y: 0.64 },
      { x: 0.47, y: 0.52 },
      { x: 0.4, y: 0.4 },
      { x: 0.36, y: 0.14 },
    ],
    tip: 'Dribble the cones, then blast a shot into the goal.',
  },
  'two-goal-rondo': {
    cones: [],
    // The far goal is the garden's real goal (top of the photo); add one at the house end.
    goals: [{ x: 0.4, y: 0.76, w: 0.28 }],
    path: [
      { x: 0.4, y: 0.72 },
      { x: 0.37, y: 0.44 },
      { x: 0.36, y: 0.16 },
    ],
    tip: 'Score in one goal, turn, and score in the other.',
  },
  'one-touch-fence': {
    cones: [{ x: 0.3, y: 0.5 }],
    path: [
      { x: 0.19, y: 0.4 },
      { x: 0.19, y: 0.62 },
    ],
    tip: 'Stand by the left fence and ping one-touch passes off it.',
  },
  'first-touch-fence': {
    cones: [{ x: 0.3, y: 0.5 }],
    path: [
      { x: 0.19, y: 0.4 },
      { x: 0.19, y: 0.62 },
    ],
    tip: 'Pass into the fence and cushion your first touch away.',
  },
}
