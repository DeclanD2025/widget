import { db } from '../db/db'
import { DRILL_BY_ID } from '../data/drills'
import type { Player, SkillKey, SkillRow, DrillResult } from '../types'
import {
  beatBest,
  drillXp,
  levelForXp,
  performance,
  skillGain,
  todayKey,
  dayDiff,
} from './game'

export interface RunDrill {
  drillId: string
  score: number
  target: number
  tier: number
}

export interface CompletionSummary {
  xpEarned: number
  leveledUp: boolean
  levelBefore: number
  levelAfter: number
  beatPBs: number
  skillDeltas: Partial<Record<SkillKey, number>>
  newBadges: { name: string; emoji: string }[]
  streak: number
}

/**
 * Apply a finished session to the player's saved progress and return a summary
 * the celebration screen can show off. Runs inside a single transaction.
 */
export async function completeSession(
  sessionId: string,
  sessionName: string,
  runDrills: RunDrill[],
): Promise<CompletionSummary> {
  return db.transaction(
    'rw',
    [db.player, db.skills, db.logs, db.bests, db.badges, db.meta],
    async () => {
      const now = new Date()
      const nowIso = now.toISOString()
      const day = todayKey(now)

      const player = await db.player.get('me')
      if (!player) throw new Error('No player profile yet')

      const levelBefore = levelForXp(player.xp).level

      // Skills as an editable map.
      const skillRows = await db.skills.toArray()
      const skills = new Map<SkillKey, number>(skillRows.map((r) => [r.key, r.value]))
      const startSkills = new Map(skills)

      let xpEarned = 0
      let beatPBs = 0
      let targetGoals = 0
      const drillResults: DrillResult[] = []
      let totalDuration = 0

      for (const run of runDrills) {
        const drill = DRILL_BY_ID[run.drillId]
        if (!drill) continue
        totalDuration += drill.durationSec

        const perf = performance(run.score, run.target, drill.scoreType)

        const prevBest = await db.bests.get(run.drillId)
        const isPB = beatBest(run.score, prevBest?.bestScore, drill.scoreType)
        if (isPB) {
          beatPBs += 1
          await db.bests.put({
            drillId: run.drillId,
            bestScore: run.score,
            scoreType: drill.scoreType,
            achievedAt: nowIso,
          })
        }

        xpEarned += drillXp(run.tier, perf, isPB)

        // Skill progression: primary gets the most, secondaries share the love.
        skills.set(drill.primarySkill, skillGain(skills.get(drill.primarySkill)!, run.tier, perf, true))
        for (const s of drill.secondarySkills) {
          skills.set(s, skillGain(skills.get(s)!, run.tier, perf, false))
        }

        if (drill.scoreType === 'goals') targetGoals += run.score

        drillResults.push({ drillId: run.drillId, score: run.score, target: run.target, beatPB: isPB })
      }

      // Persist skills.
      const updatedSkills: SkillRow[] = [...skills.entries()].map(([key, value]) => ({
        key,
        value,
        lastUpdated: nowIso,
      }))
      await db.skills.bulkPut(updatedSkills)

      // XP + level.
      const newXp = player.xp + xpEarned
      const levelAfter = levelForXp(newXp).level
      const updatedPlayer: Player = { ...player, xp: newXp, level: levelAfter }
      await db.player.put(updatedPlayer)

      // Streak.
      const streakMeta = (await db.meta.get('streak')) as
        | { key: 'streak'; currentStreak: number; longestStreak: number; lastTrainedDay: string | null }
        | undefined
      let currentStreak = 1
      if (streakMeta?.lastTrainedDay) {
        const diff = dayDiff(streakMeta.lastTrainedDay, day)
        if (diff === 0) currentStreak = streakMeta.currentStreak || 1
        else if (diff === 1) currentStreak = (streakMeta.currentStreak || 0) + 1
        else currentStreak = 1
      }
      const longestStreak = Math.max(streakMeta?.longestStreak ?? 0, currentStreak)
      await db.meta.put({ key: 'streak', currentStreak, longestStreak, lastTrainedDay: day })

      // Counters (for badges).
      const counters = (await db.meta.get('counters')) as
        | { key: 'counters'; targetGoals: number; pbCount: number }
        | undefined
      const newTargetGoals = (counters?.targetGoals ?? 0) + targetGoals
      const newPbCount = (counters?.pbCount ?? 0) + beatPBs
      await db.meta.put({ key: 'counters', targetGoals: newTargetGoals, pbCount: newPbCount })

      // Log.
      await db.logs.add({
        sessionId,
        sessionName,
        date: nowIso,
        day,
        durationSec: totalDuration,
        drillResults,
        xpEarned,
      })

      // Badges.
      const sessionCount = await db.logs.count()
      const skillVal = (k: SkillKey) => skills.get(k) ?? 0
      const checks: Record<string, boolean> = {
        'first-session': sessionCount >= 1,
        'streak-3': currentStreak >= 3,
        'streak-7': currentStreak >= 7,
        sniper: newTargetGoals >= 50,
        'weak-wand': skillVal('weakFoot') >= 60,
        'cone-magician': skillVal('dribbling') >= 70,
        'iron-lungs': skillVal('fitness') >= 70,
        'level-5': levelAfter >= 5,
        'level-10': levelAfter >= 10,
        'pb-breaker': newPbCount >= 10,
      }
      const newBadges: { name: string; emoji: string }[] = []
      for (const [id, met] of Object.entries(checks)) {
        if (!met) continue
        const badge = await db.badges.get(id)
        if (badge && !badge.earnedAt) {
          await db.badges.update(id, { earnedAt: nowIso })
          newBadges.push({ name: badge.name, emoji: badge.emoji })
        }
      }

      // Skill deltas for the summary.
      const skillDeltas: Partial<Record<SkillKey, number>> = {}
      for (const [key, value] of skills.entries()) {
        const delta = value - (startSkills.get(key) ?? 0)
        if (delta !== 0) skillDeltas[key] = delta
      }

      return {
        xpEarned,
        leveledUp: levelAfter > levelBefore,
        levelBefore,
        levelAfter,
        beatPBs,
        skillDeltas,
        newBadges,
        streak: currentStreak,
      }
    },
  )
}
