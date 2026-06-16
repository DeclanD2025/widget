import Dexie, { type Table } from 'dexie'
import type {
  Player,
  SkillRow,
  SessionLog,
  DrillBest,
  Badge,
  MetaStreak,
  FocusGoal,
  Session,
} from '../types'

export interface Counters {
  key: 'counters'
  targetGoals: number
  pbCount: number
}

export type MetaRecord = MetaStreak | Counters

export class BallerDB extends Dexie {
  player!: Table<Player, string>
  skills!: Table<SkillRow, string>
  logs!: Table<SessionLog, number>
  bests!: Table<DrillBest, string>
  badges!: Table<Badge, string>
  meta!: Table<MetaRecord, string>
  focusGoals!: Table<FocusGoal, string>
  customSessions!: Table<Session, string>

  constructor() {
    super('garden-baller')
    this.version(1).stores({
      player: 'id',
      skills: 'key',
      logs: '++id, day, sessionId',
      bests: 'drillId',
      badges: 'id',
      meta: 'key',
      focusGoals: 'skillKey',
      customSessions: 'id',
    })
  }
}

export const db = new BallerDB()
