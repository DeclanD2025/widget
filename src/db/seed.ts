import { db } from './db'
import { BADGE_DEFS } from '../data/badges'
import { SKILL_KEYS } from '../types'

/**
 * Make sure the supporting tables (skills, badges, focus goals, meta) exist.
 * Safe to call on every launch — it only fills in what is missing.
 */
export async function ensureSeed(): Promise<void> {
  const now = new Date().toISOString()

  const skillCount = await db.skills.count()
  if (skillCount === 0) {
    await db.skills.bulkAdd(
      SKILL_KEYS.map((key) => ({ key, value: 30, lastUpdated: now })),
    )
  }

  const badgeCount = await db.badges.count()
  if (badgeCount === 0) {
    await db.badges.bulkAdd(BADGE_DEFS.map((b) => ({ ...b, earnedAt: null })))
  } else {
    // Add any badges introduced in a later release.
    for (const def of BADGE_DEFS) {
      const existing = await db.badges.get(def.id)
      if (!existing) await db.badges.add({ ...def, earnedAt: null })
    }
  }

  const focusCount = await db.focusGoals.count()
  if (focusCount === 0) {
    await db.focusGoals.bulkAdd(
      SKILL_KEYS.map((skillKey) => ({ skillKey, selected: false })),
    )
  }

  const streak = await db.meta.get('streak')
  if (!streak) {
    await db.meta.put({ key: 'streak', currentStreak: 0, longestStreak: 0, lastTrainedDay: null })
  }

  const counters = await db.meta.get('counters')
  if (!counters) {
    await db.meta.put({ key: 'counters', targetGoals: 0, pbCount: 0 })
  }
}
