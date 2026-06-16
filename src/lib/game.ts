import type { Drill, ScoreType, SkillRow } from '../types'

// ---------- Scoring helpers ----------

export function isHigherBetter(t: ScoreType): boolean {
  return t !== 'time'
}

/** Tune a drill's target for a difficulty tier (1-5). */
export function tierTarget(drill: Drill, tier: number): number {
  if (drill.scoreType === 'time') {
    // Lower is better — shave time off as the tier rises.
    return Math.max(5, Math.round(drill.baseTarget * (1 - 0.08 * (tier - 1))))
  }
  // Higher is better — ask for more reps/goals as the tier rises.
  return Math.round(drill.baseTarget * (1 + 0.2 * (tier - 1)))
}

/** How well the player did vs the target, 0..1.3 (capped). */
export function performance(score: number, target: number, scoreType: ScoreType): number {
  if (score <= 0 || target <= 0) return 0
  const ratio = scoreType === 'time' ? target / score : score / target
  return Math.max(0, Math.min(1.3, ratio))
}

export function beatBest(
  newScore: number,
  oldBest: number | undefined,
  scoreType: ScoreType,
): boolean {
  if (oldBest === undefined) return newScore > 0
  return isHigherBetter(scoreType) ? newScore > oldBest : newScore < oldBest
}

// ---------- XP & levels ----------

export function drillXp(tier: number, perf: number, beatPB: boolean): number {
  const base = 20 + tier * 10
  const perfBonus = Math.round(base * 0.5 * Math.min(1, perf))
  const pbBonus = beatPB ? 25 : 0
  return base + perfBonus + pbBonus
}

export interface LevelInfo {
  level: number
  intoLevel: number // xp earned within the current level
  span: number // xp needed to clear the current level
}

/** Convert total XP into a level + progress within that level. */
export function levelForXp(xp: number): LevelInfo {
  let level = 1
  let acc = 0
  let span = 100
  while (xp >= acc + span) {
    acc += span
    level += 1
    span = 100 + (level - 1) * 50
  }
  return { level, intoLevel: xp - acc, span }
}

// ---------- Skills & rating ----------

/**
 * Nudge a skill value (0-99) upward after a drill. Higher tiers raise the
 * ceiling; you gain less as you approach it, so progress always feels earned.
 */
export function skillGain(
  current: number,
  tier: number,
  perf: number,
  isPrimary: boolean,
): number {
  const ceiling = Math.min(99, 35 + tier * 13)
  const headroom = Math.max(0, ceiling - current)
  const base = isPrimary ? 4 : 2
  const raw = base * perf * (0.3 + 0.7 * (headroom / 99))
  const gain = Math.round(raw)
  // Always reward effort on your primary skill with at least +1.
  const applied = isPrimary ? Math.max(1, gain) : gain
  return Math.max(0, Math.min(99, current + applied))
}

export function ovr(skills: SkillRow[]): number {
  if (skills.length === 0) return 0
  const total = skills.reduce((s, r) => s + r.value, 0)
  return Math.round(total / skills.length)
}

/** EA-FC-style card rarity from overall rating. `grad` is a Tailwind gradient. */
export function cardTier(ovrValue: number): { label: string; grad: string } {
  if (ovrValue >= 85) return { label: 'Icon', grad: 'from-fuchsia-500/60 via-purple-700/40 to-base-800/60' }
  if (ovrValue >= 75) return { label: 'Gold', grad: 'from-gold/70 via-gold-deep/40 to-base-800/70' }
  if (ovrValue >= 60) return { label: 'Silver', grad: 'from-slate-300/40 via-slate-500/25 to-base-800/70' }
  return { label: 'Bronze', grad: 'from-orange-600/45 via-amber-800/30 to-base-800/70' }
}

export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** Difference in whole days between two YYYY-MM-DD strings. */
export function dayDiff(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}
