import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { SKILL_KEYS } from '../types'
import type { MetaStreak } from '../types'

export function usePlayer() {
  return useLiveQuery(() => db.player.get('me'), [])
}

export function useSkills() {
  return useLiveQuery(async () => {
    const rows = await db.skills.toArray()
    // Keep a stable skill order for the bars.
    return SKILL_KEYS.map((key) => rows.find((r) => r.key === key)).filter(Boolean) as NonNullable<
      (typeof rows)[number]
    >[]
  }, [])
}

export function useStreak() {
  return useLiveQuery(() => db.meta.get('streak') as Promise<MetaStreak | undefined>, [])
}

export function useLogs(limit = 30) {
  return useLiveQuery(async () => {
    const all = await db.logs.orderBy('id').reverse().limit(limit).toArray()
    return all
  }, [limit])
}

export function useBadges() {
  return useLiveQuery(() => db.badges.toArray(), [])
}

export function useFocusGoals() {
  return useLiveQuery(() => db.focusGoals.toArray(), [])
}

export function useCustomSessions() {
  return useLiveQuery(() => db.customSessions.toArray(), [])
}

export function useBests() {
  return useLiveQuery(() => db.bests.toArray(), [])
}
