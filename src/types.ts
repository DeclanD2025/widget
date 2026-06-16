// Core domain types for Garden Baller.

export type SkillKey =
  | 'shooting'
  | 'passing'
  | 'dribbling'
  | 'fitness'
  | 'weakFoot'
  | 'control'

export const SKILL_KEYS: SkillKey[] = [
  'shooting',
  'passing',
  'dribbling',
  'fitness',
  'weakFoot',
  'control',
]

export const SKILL_LABELS: Record<SkillKey, string> = {
  shooting: 'Shooting',
  passing: 'Passing',
  dribbling: 'Dribbling',
  fitness: 'Fitness',
  weakFoot: 'Weak Foot',
  control: 'Control',
}

export type ScoreType = 'goals' | 'reps' | 'time' | 'count'
// 'time' is "lower is better" (seconds); the rest are "higher is better".

export type ModeKey =
  | 'quick10'
  | 'full30'
  | 'shooting'
  | 'dribbling'
  | 'fence'
  | 'weakFoot'
  | 'matchday'
  | 'fitness'
  | 'custom'

export interface Drill {
  id: string
  name: string
  emoji: string
  instructions: string[]
  equipment: string[]
  primarySkill: SkillKey
  secondarySkills: SkillKey[]
  scoreType: ScoreType
  /** Default target at tier 1 (goals to score, reps to hit, or seconds for time). */
  baseTarget: number
  /** Default work time per drill in seconds. */
  durationSec: number
  /** Level required before this drill card unlocks. 0 = available from the start. */
  unlockLevel: number
}

/** A single drill inside a session, with its target tuned to a difficulty tier. */
export interface SessionDrill {
  drillId: string
  target: number
  durationSec: number
  tier: number
}

export interface Session {
  id: string
  name: string
  mode: ModeKey
  emoji: string
  blurb: string
  drillRefs: SessionDrill[]
  isCustom: boolean
}

export interface DrillResult {
  drillId: string
  score: number
  target: number
  beatPB: boolean
}

export interface SessionLog {
  id?: number
  sessionId: string
  sessionName: string
  date: string // ISO date-time
  day: string // YYYY-MM-DD for streak math
  durationSec: number
  drillResults: DrillResult[]
  xpEarned: number
}

export interface Player {
  id: string // always 'me' — single player
  name: string
  age: number
  strongFoot: 'L' | 'R'
  colour: string // club colour hex
  avatar: string // emoji avatar
  level: number
  xp: number
  createdAt: string
}

export interface SkillRow {
  key: SkillKey
  value: number // 0-99
  lastUpdated: string
}

export interface DrillBest {
  drillId: string
  bestScore: number
  scoreType: ScoreType
  achievedAt: string
}

export interface Badge {
  id: string
  name: string
  emoji: string
  description: string
  earnedAt: string | null
}

export interface MetaStreak {
  key: 'streak'
  currentStreak: number
  longestStreak: number
  lastTrainedDay: string | null // YYYY-MM-DD
}

export interface FocusGoal {
  skillKey: SkillKey
  selected: boolean
}
