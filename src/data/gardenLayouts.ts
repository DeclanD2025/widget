// Drill overlays drawn on top of the flattened garden. All coordinates are
// normalised 0..1 over the pitch rectangle: x = left→right, y = far→near
// (y=0 is the far end where a goal usually sits).

export interface LayoutPoint {
  x: number
  y: number
}

export interface GardenLayout {
  cones: LayoutPoint[]
  /** Dribble / run path drawn as an arrowed line. */
  path?: LayoutPoint[]
  /** Goal mouths to draw (x is centre, w is width). */
  goals?: { x: number; y: number; w: number }[]
  /** Shooting / target markers. */
  targets?: LayoutPoint[]
  tip: string
}

export const GARDEN_LAYOUTS: Record<string, GardenLayout> = {
  'cone-slalom': {
    cones: [
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.35 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.65 },
      { x: 0.5, y: 0.8 },
    ],
    path: [
      { x: 0.5, y: 0.9 },
      { x: 0.38, y: 0.8 },
      { x: 0.62, y: 0.65 },
      { x: 0.38, y: 0.5 },
      { x: 0.62, y: 0.35 },
      { x: 0.5, y: 0.15 },
    ],
    tip: 'Weave through the cones with small touches, then sprint back.',
  },
  'gate-dribbles': {
    cones: [
      { x: 0.42, y: 0.5 },
      { x: 0.58, y: 0.5 },
    ],
    path: [
      { x: 0.5, y: 0.85 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.2 },
    ],
    tip: 'Dribble through the gate, turn, and come back through.',
  },
  'shuttle-sprints': {
    cones: [
      { x: 0.5, y: 0.18 },
      { x: 0.5, y: 0.82 },
    ],
    path: [
      { x: 0.5, y: 0.82 },
      { x: 0.5, y: 0.18 },
    ],
    tip: 'Sprint cone to cone and back — that is one rep.',
  },
  'close-control-box': {
    cones: [
      { x: 0.38, y: 0.4 },
      { x: 0.62, y: 0.4 },
      { x: 0.62, y: 0.7 },
      { x: 0.38, y: 0.7 },
    ],
    path: [
      { x: 0.38, y: 0.4 },
      { x: 0.62, y: 0.4 },
      { x: 0.62, y: 0.7 },
      { x: 0.38, y: 0.7 },
      { x: 0.38, y: 0.4 },
    ],
    tip: 'Dribble around the square with tiny touches. Count your laps.',
  },
  'target-shooting': {
    cones: [],
    targets: [
      { x: 0.4, y: 0.08 },
      { x: 0.6, y: 0.08 },
    ],
    path: [
      { x: 0.5, y: 0.75 },
      { x: 0.5, y: 0.2 },
    ],
    tip: 'Aim for the cones in the corners of the goal.',
  },
  'shoot-after-dribble': {
    cones: [
      { x: 0.5, y: 0.7 },
      { x: 0.5, y: 0.55 },
      { x: 0.5, y: 0.4 },
    ],
    path: [
      { x: 0.5, y: 0.85 },
      { x: 0.4, y: 0.7 },
      { x: 0.6, y: 0.55 },
      { x: 0.5, y: 0.4 },
      { x: 0.5, y: 0.15 },
    ],
    tip: 'Dribble the cones, then blast a shot into the goal.',
  },
  'two-goal-rondo': {
    cones: [],
    // The far goal is the garden's permanent goal; add a second at the house end.
    goals: [{ x: 0.5, y: 0.88, w: 0.32 }],
    path: [
      { x: 0.5, y: 0.82 },
      { x: 0.45, y: 0.5 },
      { x: 0.5, y: 0.2 },
    ],
    tip: 'Score in one goal, turn, and score in the other.',
  },
  'one-touch-fence': {
    cones: [{ x: 0.5, y: 0.55 }],
    // Fence shown as a thick line down the right side.
    path: [
      { x: 0.85, y: 0.3 },
      { x: 0.85, y: 0.8 },
    ],
    tip: 'Stand by the fence and ping one-touch passes off it.',
  },
  'first-touch-fence': {
    cones: [{ x: 0.5, y: 0.55 }],
    path: [
      { x: 0.85, y: 0.3 },
      { x: 0.85, y: 0.8 },
    ],
    tip: 'Pass into the fence and cushion your first touch away.',
  },
}
