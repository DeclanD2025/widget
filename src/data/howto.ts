// "How to" skill tutorials, each with a diagram spec.

export type SkillDiagramSpec =
  | { kind: 'strike'; contact: { x: number; y: number }; flight: 'straight' | 'wobble' | 'curl-l' | 'curl-r' | 'dip'; footPart: string }
  | { kind: 'move'; arrows: { x1: number; y1: number; x2: number; y2: number; curve?: number; dashed?: boolean }[]; footPart: string }

export type Difficulty = 'Starter' | 'Tricky' | 'Pro'

export interface SkillGuide {
  id: string
  name: string
  difficulty: Difficulty
  what: string
  steps: string[]
  tip: string
  diagram: SkillDiagramSpec
}

export const SKILL_GUIDES: SkillGuide[] = [
  {
    id: 'driven-shot',
    name: 'Driven Shot',
    difficulty: 'Starter',
    what: 'A clean, powerful low shot — the base for everything else.',
    steps: [
      'Plant your standing foot beside the ball, pointing at the target.',
      'Lock your ankle and strike through the middle of the ball with your laces.',
      'Lean over the ball to keep it low, and follow through toward the goal.',
    ],
    tip: 'Toes down, ankle locked like a hammer. Power comes from a clean contact, not a wild swing.',
    diagram: { kind: 'strike', contact: { x: 0.5, y: 0.52 }, flight: 'straight', footPart: 'Laces (top of the foot)' },
  },
  {
    id: 'knuckleball',
    name: 'Knuckleball',
    difficulty: 'Pro',
    what: 'A shot with almost no spin, so it wobbles and dips in the air.',
    steps: [
      'Strike right through the middle/back of the ball with a firm, locked ankle.',
      'Use a short, sharp follow-through — then stop. Do NOT wrap your foot around it.',
      'Aim to give the ball no spin: that wobble is what makes it move late.',
    ],
    tip: 'Less follow-through = less spin = more wobble. Power with a stiff ankle, then "cut" the kick short.',
    diagram: { kind: 'strike', contact: { x: 0.5, y: 0.46 }, flight: 'wobble', footPart: 'Firm laces, short follow-through' },
  },
  {
    id: 'trivela',
    name: 'Trivela',
    difficulty: 'Tricky',
    what: 'A pass or shot struck with the OUTSIDE of the foot that curls and dips.',
    steps: [
      'Approach almost straight on, ball just outside your kicking foot.',
      'Strike the bottom-outer part of the ball with the outside of your foot (near your little toe).',
      'Wrap across the ball — it spins, curls away and dips toward the target.',
    ],
    tip: 'Great for crossing or shooting without opening your hips. Brush across the ball, do not just poke it.',
    diagram: { kind: 'strike', contact: { x: 0.66, y: 0.6 }, flight: 'curl-l', footPart: 'Outside of the foot' },
  },
  {
    id: 'stepover',
    name: 'Stepover',
    difficulty: 'Starter',
    what: 'A fake to send a defender the wrong way, then go the other side.',
    steps: [
      'Roll your foot AROUND the ball (not touching it) as if pushing it one way.',
      'As the defender shifts that way, push the ball the OTHER way with your outside foot.',
      'Accelerate past them into the space.',
    ],
    tip: 'Sell it with your shoulders and a slow-then-fast change of pace. The fake means nothing without the burst.',
    diagram: {
      kind: 'move',
      footPart: 'Step over, then push with outside foot',
      arrows: [
        { x1: 0.5, y1: 0.62, x2: 0.74, y2: 0.42, curve: 0.5 },
        { x1: 0.5, y1: 0.62, x2: 0.26, y2: 0.5, dashed: true },
      ],
    },
  },
  {
    id: 'cruyff-turn',
    name: 'Cruyff Turn',
    difficulty: 'Starter',
    what: 'A fake pass/shot, then drag the ball behind your standing leg to turn.',
    steps: [
      'Shape up like you are about to pass or shoot.',
      'Instead, use the inside of your foot to drag the ball behind your standing leg.',
      'Spin and go the opposite way, leaving the defender behind.',
    ],
    tip: 'The bigger the fake shot, the better the turn works. Keep the drag-touch small and tight.',
    diagram: {
      kind: 'move',
      footPart: 'Inside foot drag behind standing leg',
      arrows: [
        { x1: 0.5, y1: 0.55, x2: 0.72, y2: 0.4, dashed: true },
        { x1: 0.5, y1: 0.55, x2: 0.3, y2: 0.78, curve: -0.4 },
      ],
    },
  },
  {
    id: 'elastico',
    name: 'Elastico (Flip-Flap)',
    difficulty: 'Pro',
    what: 'Push the ball out with the outside of your foot, then snap it back with the inside.',
    steps: [
      'Push the ball slightly out wide using the outside of your foot.',
      'Instantly snap it back the other way with the inside of the same foot.',
      'It happens in one quick flick — out, then back, fast.',
    ],
    tip: 'Start slow to learn the two touches, then speed up. All one motion with the same foot.',
    diagram: {
      kind: 'move',
      footPart: 'Outside push, then inside snap-back',
      arrows: [
        { x1: 0.5, y1: 0.6, x2: 0.74, y2: 0.55, curve: 0.3 },
        { x1: 0.74, y1: 0.55, x2: 0.32, y2: 0.62, curve: -0.4 },
      ],
    },
  },
  {
    id: 'rabona',
    name: 'Rabona',
    difficulty: 'Pro',
    what: 'Kick the ball by wrapping your kicking leg BEHIND your standing leg.',
    steps: [
      'Plant your standing foot beside the ball (a bit ahead of it).',
      'Swing your kicking leg behind and around your standing leg.',
      'Strike through the ball with your laces — toward your target.',
    ],
    tip: 'A trick for when the ball is on your "wrong" side. Learn it slowly with a still ball first — balance is everything.',
    diagram: {
      kind: 'move',
      footPart: 'Kicking leg wraps behind the standing leg',
      arrows: [
        { x1: 0.5, y1: 0.62, x2: 0.5, y2: 0.2 },
        { x1: 0.62, y1: 0.85, x2: 0.4, y2: 0.7, curve: 0.5, dashed: true },
      ],
    },
  },
]

export const SKILL_BY_ID: Record<string, SkillGuide> = Object.fromEntries(SKILL_GUIDES.map((s) => [s.id, s]))
