import { db } from '../db/db'
import { drillXp, levelForXp, skillGain } from './game'

export interface KeepyUppyResult {
  best: number
  prevBest: number
  beat: boolean
  xpEarned: number
  leveledUp: boolean
  newBadge: { name: string; emoji: string } | null
}

/** Save the in-progress attempts for the week (no XP yet). */
export async function saveKeepyUppyProgress(weekStart: string, attempts: number[]): Promise<void> {
  await db.keepyUppy.put({
    weekStart,
    attempts,
    best: attempts.length ? Math.max(...attempts) : 0,
    xpAwarded: false,
    updatedAt: new Date().toISOString(),
  })
}

/** Finish the week's best-of-3: award XP, nudge ball-mastery skills, check the badge. */
export async function finishKeepyUppy(weekStart: string, attempts: number[]): Promise<KeepyUppyResult> {
  return db.transaction('rw', [db.player, db.skills, db.keepyUppy, db.badges], async () => {
    const now = new Date().toISOString()
    const best = Math.max(...attempts)

    const all = await db.keepyUppy.toArray()
    const prevBest = Math.max(0, ...all.filter((r) => r.weekStart !== weekStart).map((r) => r.best))
    const beat = best > prevBest

    const player = await db.player.get('me')
    if (!player) throw new Error('No player')
    const levelBefore = levelForXp(player.xp).level

    const tier = Math.max(1, Math.min(5, Math.ceil(best / 12)))
    const xpEarned = drillXp(tier, 1, beat) + best
    const newXp = player.xp + xpEarned
    const levelAfter = levelForXp(newXp).level
    await db.player.put({ ...player, xp: newXp, level: levelAfter })

    // Ball mastery feeds Control most, Fitness a little.
    const ctrl = await db.skills.get('control')
    if (ctrl) await db.skills.put({ ...ctrl, value: skillGain(ctrl.value, tier, 1, true), lastUpdated: now })
    const fit = await db.skills.get('fitness')
    if (fit) await db.skills.put({ ...fit, value: skillGain(fit.value, tier, 0.6, false), lastUpdated: now })

    await db.keepyUppy.put({ weekStart, attempts, best, xpAwarded: true, updatedAt: now })

    // Badge: Juggler at 50+ keepy-ups.
    let newBadge: { name: string; emoji: string } | null = null
    if (best >= 50) {
      const badge = await db.badges.get('juggler')
      if (badge && !badge.earnedAt) {
        await db.badges.update('juggler', { earnedAt: now })
        newBadge = { name: badge.name, emoji: badge.emoji }
      }
    }

    return { best, prevBest, beat, xpEarned, leveledUp: levelAfter > levelBefore, newBadge }
  })
}
