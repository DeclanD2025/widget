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

export interface Point {
  x: number
  y: number
}

/** A photo of the garden plus the tapped grass corners used to flatten it. */
export interface Garden {
  id: 'garden'
  imageDataUrl: string
  /** Corners (TL, TR, BR, BL) in displayed-image coordinate space. */
  corners: [Point, Point, Point, Point]
  dispW: number
  dispH: number
  savedAt: string
}

/** A week's best-of-3 keepy-up challenge. */
export interface KeepyUppy {
  weekStart: string // YYYY-MM-DD (Monday)
  attempts: number[]
  best: number
  xpAwarded: boolean
  updatedAt: string
}

export class BallerDB extends Dexie {
  player!: Table<Player, string>
  skills!: Table<SkillRow, string>
  logs!: Table<SessionLog, number>
  bests!: Table<DrillBest, string>
  badges!: Table<Badge, string>
  meta!: Table<MetaRecord, string>
  focusGoals!: Table<FocusGoal, string>
  customSessions!: Table<Session, string>
  garden!: Table<Garden, string>
  keepyUppy!: Table<KeepyUppy, string>

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
    this.version(2).stores({
      garden: 'id',
    })
    this.version(3).stores({
      keepyUppy: 'weekStart',
    })
  }
}

export const db = new BallerDB()
