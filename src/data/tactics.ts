// "Guide to Football" concepts, each with a pitch diagram.
// Coordinates are normalised 0..1 over a horizontal pitch (x: left→right).
// Our team = 'a' (emerald), the opponent = 'b' (white). Our team attacks RIGHT.

export interface PitchPlayer {
  x: number
  y: number
  team: 'a' | 'b'
  label?: string
  highlight?: 'good' | 'bad'
}
export interface PitchArrow {
  x1: number
  y1: number
  x2: number
  y2: number
  dashed?: boolean
  color?: string
}
export interface PitchVLine {
  x: number
  label?: string
  color?: string
}
export interface PitchDiagramSpec {
  players: PitchPlayer[]
  arrows?: PitchArrow[]
  vlines?: PitchVLine[]
  ball?: { x: number; y: number }
}

export type TacticGroup = 'Rules' | 'Pressing' | 'Defending' | 'Attacking' | 'Formations'

export interface Tactic {
  id: string
  name: string
  group: TacticGroup
  tagline: string
  what: string
  points: string[]
  diagram: PitchDiagramSpec
}

const back4 = (x: number, team: 'a' | 'b'): PitchPlayer[] =>
  [0.2, 0.4, 0.6, 0.8].map((y) => ({ x, y, team }))

export const TACTICS: Tactic[] = [
  {
    id: 'offside',
    name: 'Offside',
    group: 'Rules',
    tagline: 'The most misunderstood rule',
    what: 'You are offside if you are nearer the opponent\'s goal than both the ball AND the second-last defender at the moment a team-mate plays the ball to you.',
    points: [
      'It is judged WHEN the ball is passed, not when you receive it.',
      'You can be in front of the last defender — just not when the pass is played.',
      'You are never offside in your own half, or from a throw-in.',
      'Being level with the last defender is onside.',
    ],
    diagram: {
      players: [
        { x: 0.4, y: 0.5, team: 'a', label: 'P' },
        { x: 0.72, y: 0.38, team: 'a', highlight: 'bad' },
        { x: 0.58, y: 0.68, team: 'a', highlight: 'good' },
        { x: 0.64, y: 0.3, team: 'b' },
        { x: 0.64, y: 0.5, team: 'b' },
        { x: 0.64, y: 0.7, team: 'b' },
        { x: 0.94, y: 0.5, team: 'b', label: 'GK' },
      ],
      arrows: [{ x1: 0.42, y1: 0.5, x2: 0.7, y2: 0.39, dashed: true }],
      vlines: [{ x: 0.64, label: 'OFFSIDE LINE' }],
      ball: { x: 0.4, y: 0.55 },
    },
  },
  {
    id: 'high-press',
    name: 'High Press',
    group: 'Pressing',
    tagline: 'Win the ball high up the pitch',
    what: 'Your team pushes right up to the opponent\'s goal and hunts the ball straight after losing it, so a mistake near their goal becomes a chance for you.',
    points: [
      'Squeeze high and cut off easy passes (block the angles).',
      'Press as a unit — one player chases, the others back them up.',
      'Win it close to their goal = quick shooting chances.',
      'Risk: leaves space in behind, so it needs energy and timing.',
    ],
    diagram: {
      players: [
        { x: 0.55, y: 0.5, team: 'a' },
        { x: 0.68, y: 0.3, team: 'a' },
        { x: 0.68, y: 0.7, team: 'a' },
        { x: 0.78, y: 0.5, team: 'a' },
        { x: 0.82, y: 0.32, team: 'b' },
        { x: 0.82, y: 0.68, team: 'b' },
        { x: 0.93, y: 0.5, team: 'b', label: 'GK' },
      ],
      arrows: [
        { x1: 0.6, y1: 0.5, x2: 0.78, y2: 0.46 },
        { x1: 0.7, y1: 0.32, x2: 0.8, y2: 0.34 },
        { x1: 0.7, y1: 0.68, x2: 0.8, y2: 0.66 },
      ],
      ball: { x: 0.84, y: 0.5 },
    },
  },
  {
    id: 'low-block',
    name: 'Low Block',
    group: 'Defending',
    tagline: 'Defend deep and compact',
    what: 'Your team drops back near its own goal in two tight banks (usually 4 + 4), giving the opponent no space to play through. You soak up pressure, then counter.',
    points: [
      'Stay compact — small gaps between players and between the lines.',
      'Protect the middle; make them go round the outside.',
      'Hard to break down, but you spend long spells without the ball.',
      'Springboard for fast counter-attacks when you win it.',
    ],
    diagram: {
      players: [
        { x: 0.06, y: 0.5, team: 'a', label: 'GK' },
        ...back4(0.2, 'a'),
        ...back4(0.32, 'a'),
        { x: 0.55, y: 0.5, team: 'b' },
        { x: 0.5, y: 0.3, team: 'b' },
        { x: 0.5, y: 0.7, team: 'b' },
      ],
      ball: { x: 0.55, y: 0.5 },
    },
  },
  {
    id: 'mid-block',
    name: 'Mid Block',
    group: 'Defending',
    tagline: 'Hold your shape around halfway',
    what: 'A balance between pressing high and sitting deep: the team defends in its own half around the halfway line, staying compact and pouncing when the ball comes into range.',
    points: [
      'Less risky than a high press, more active than a low block.',
      'Invite the opponent in, then press once they cross halfway.',
      'Keeps the team connected and hard to play through.',
    ],
    diagram: {
      players: [
        { x: 0.06, y: 0.5, team: 'a', label: 'GK' },
        ...back4(0.32, 'a'),
        ...back4(0.46, 'a'),
        { x: 0.62, y: 0.5, team: 'b' },
        { x: 0.7, y: 0.3, team: 'b' },
        { x: 0.7, y: 0.7, team: 'b' },
      ],
      vlines: [{ x: 0.5, label: 'HALFWAY', color: 'rgba(255,255,255,0.5)' }],
      ball: { x: 0.62, y: 0.5 },
    },
  },
  {
    id: 'counter-attack',
    name: 'Counter-Attack',
    group: 'Attacking',
    tagline: 'Hit them fast when they\'re open',
    what: 'The moment you win the ball, you attack quickly before the opponent can get back into shape — fast forward passes and runners sprinting in behind.',
    points: [
      'Speed is everything: play forward first, fast.',
      'Runners stretch the pitch and get in behind.',
      'Best right after winning the ball, when they are out of position.',
    ],
    diagram: {
      players: [
        { x: 0.35, y: 0.5, team: 'a', highlight: 'good' },
        { x: 0.45, y: 0.25, team: 'a' },
        { x: 0.5, y: 0.75, team: 'a' },
        { x: 0.28, y: 0.35, team: 'b' },
        { x: 0.3, y: 0.62, team: 'b' },
      ],
      arrows: [
        { x1: 0.38, y1: 0.5, x2: 0.72, y2: 0.3 },
        { x1: 0.5, y1: 0.72, x2: 0.8, y2: 0.6, dashed: true },
      ],
      ball: { x: 0.35, y: 0.55 },
    },
  },
  {
    id: 'overlap',
    name: 'The Overlap',
    group: 'Attacking',
    tagline: 'Full-back runs outside the winger',
    what: 'The full-back sprints OUTSIDE and beyond the winger, who has the ball. It gives the winger a passing option and forces the defender to make a tough choice.',
    points: [
      'Winger holds the ball and draws the defender in.',
      'Full-back overlaps on the outside into space.',
      'Defender can\'t cover both — someone is free.',
    ],
    diagram: {
      players: [
        { x: 0.55, y: 0.78, team: 'a', highlight: 'good' },
        { x: 0.6, y: 0.6, team: 'a' },
        { x: 0.66, y: 0.85, team: 'b' },
      ],
      arrows: [
        { x1: 0.55, y1: 0.78, x2: 0.78, y2: 0.82 },
        { x1: 0.6, y1: 0.62, x2: 0.74, y2: 0.8, dashed: true },
      ],
      ball: { x: 0.6, y: 0.6 },
    },
  },
  {
    id: 'third-man-run',
    name: 'Third-Man Run',
    group: 'Attacking',
    tagline: 'The runner you didn\'t see',
    what: 'Player 1 passes to Player 2, and while the defenders watch those two, a THIRD player bursts forward to receive the next pass in space.',
    points: [
      'Pass, then a quick second pass sets up the runner.',
      'Defenders focus on the ball — the third man is missed.',
      'Brilliant for slicing through a packed defence.',
    ],
    diagram: {
      players: [
        { x: 0.3, y: 0.5, team: 'a', label: '1' },
        { x: 0.5, y: 0.3, team: 'a', label: '2' },
        { x: 0.45, y: 0.7, team: 'a', label: '3', highlight: 'good' },
        { x: 0.62, y: 0.45, team: 'b' },
      ],
      arrows: [
        { x1: 0.32, y1: 0.49, x2: 0.49, y2: 0.32 },
        { x1: 0.5, y1: 0.34, x2: 0.66, y2: 0.62 },
        { x1: 0.47, y1: 0.68, x2: 0.7, y2: 0.62, dashed: true },
      ],
      ball: { x: 0.3, y: 0.55 },
    },
  },
  {
    id: 'pressing-triggers',
    name: 'Pressing Triggers',
    group: 'Pressing',
    tagline: 'WHEN to jump and press',
    what: 'You don\'t press all the time — you wait for a "trigger": a bad touch, a backwards/sideways pass, or a pass to a player facing their own goal. Then you pounce together.',
    points: [
      'Triggers: heavy touch, back-pass, or a player facing their own goal.',
      'When it happens, the nearest player presses instantly.',
      'Team-mates squeeze up behind to cut off the escape pass.',
    ],
    diagram: {
      players: [
        { x: 0.6, y: 0.5, team: 'a', highlight: 'good' },
        { x: 0.5, y: 0.3, team: 'a' },
        { x: 0.5, y: 0.7, team: 'a' },
        { x: 0.72, y: 0.5, team: 'b' },
        { x: 0.8, y: 0.3, team: 'b' },
        { x: 0.8, y: 0.7, team: 'b' },
      ],
      arrows: [
        { x1: 0.62, y1: 0.5, x2: 0.7, y2: 0.5 },
        { x1: 0.52, y1: 0.32, x2: 0.62, y2: 0.36, dashed: true },
        { x1: 0.52, y1: 0.68, x2: 0.62, y2: 0.64, dashed: true },
      ],
      ball: { x: 0.74, y: 0.5 },
    },
  },
  {
    id: 'marking',
    name: 'Man vs Zonal Marking',
    group: 'Defending',
    tagline: 'Two ways to defend',
    what: 'Man-marking: each defender sticks to one attacker wherever they go. Zonal marking: each defender guards a ZONE of the pitch and marks whoever enters it.',
    points: [
      'Man-marking: tight and personal, but you can be dragged out of shape.',
      'Zonal: keeps your shape, but needs good communication.',
      'Most teams mix both, especially at corners and free-kicks.',
    ],
    diagram: {
      players: [
        { x: 0.35, y: 0.3, team: 'a' },
        { x: 0.42, y: 0.3, team: 'b' },
        { x: 0.55, y: 0.55, team: 'a' },
        { x: 0.62, y: 0.55, team: 'b' },
        { x: 0.4, y: 0.75, team: 'a' },
        { x: 0.47, y: 0.75, team: 'b' },
      ],
      arrows: [
        { x1: 0.37, y1: 0.31, x2: 0.41, y2: 0.31, dashed: true },
        { x1: 0.57, y1: 0.55, x2: 0.61, y2: 0.55, dashed: true },
        { x1: 0.42, y1: 0.74, x2: 0.46, y2: 0.74, dashed: true },
      ],
    },
  },
  {
    id: 'formation-352',
    name: '3-5-2',
    group: 'Formations',
    tagline: 'Pack the midfield, wing-backs fly',
    what: 'Three centre-backs, five midfielders (with two wing-backs giving width), and two strikers. Dominates the middle of the pitch and uses wing-backs for width.',
    points: [
      'Three at the back, with wing-backs providing all the width.',
      'Five in midfield outnumber most opponents in the centre.',
      'Two strikers stay high to attack together.',
    ],
    diagram: {
      players: [
        { x: 0.06, y: 0.5, team: 'a', label: 'GK' },
        { x: 0.2, y: 0.3, team: 'a' },
        { x: 0.2, y: 0.5, team: 'a' },
        { x: 0.2, y: 0.7, team: 'a' },
        { x: 0.42, y: 0.12, team: 'a' },
        { x: 0.4, y: 0.38, team: 'a' },
        { x: 0.4, y: 0.62, team: 'a' },
        { x: 0.42, y: 0.88, team: 'a' },
        { x: 0.5, y: 0.5, team: 'a' },
        { x: 0.7, y: 0.4, team: 'a' },
        { x: 0.7, y: 0.6, team: 'a' },
      ],
    },
  },
  {
    id: 'formation-433',
    name: '4-3-3',
    group: 'Formations',
    tagline: 'Width and attacking threat',
    what: 'Four defenders, three midfielders, three forwards. Great for attacking with wingers high and wide, and pressing high up the pitch.',
    points: [
      'Wingers stretch the pitch and stay high.',
      'Three midfielders control the centre.',
      'Strong for a high press and quick combinations.',
    ],
    diagram: {
      players: [
        { x: 0.06, y: 0.5, team: 'a', label: 'GK' },
        ...back4(0.24, 'a'),
        { x: 0.45, y: 0.3, team: 'a' },
        { x: 0.45, y: 0.5, team: 'a' },
        { x: 0.45, y: 0.7, team: 'a' },
        { x: 0.7, y: 0.22, team: 'a' },
        { x: 0.72, y: 0.5, team: 'a' },
        { x: 0.7, y: 0.78, team: 'a' },
      ],
    },
  },
  {
    id: 'formation-442',
    name: '4-4-2',
    group: 'Formations',
    tagline: 'Classic, balanced, two banks of four',
    what: 'Four defenders, four midfielders, two strikers. Simple, solid and balanced — two banks of four make it tough to break down.',
    points: [
      'Two strikers stay central to attack together.',
      'Two banks of four are compact and organised.',
      'Easy to understand — a brilliant shape to learn the game with.',
    ],
    diagram: {
      players: [
        { x: 0.06, y: 0.5, team: 'a', label: 'GK' },
        ...back4(0.24, 'a'),
        ...back4(0.48, 'a'),
        { x: 0.72, y: 0.4, team: 'a' },
        { x: 0.72, y: 0.6, team: 'a' },
      ],
    },
  },
]

export const TACTIC_BY_ID: Record<string, Tactic> = Object.fromEntries(TACTICS.map((t) => [t.id, t]))
