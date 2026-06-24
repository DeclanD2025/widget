import { combineConfidence, confidence } from './confidence'
import { classifyGoalOutcome } from './goalTracker'
import { distance, magnitude, subtract } from './geometry'
import { buildShotMetrics } from './shotMetrics'
import type {
  BallObservation,
  BallTrack,
  CalibrationProfile,
  GoalTrack,
  PlayerTrack,
  ShotEvent,
  VisionFrame,
} from './types'

type DetectorState = 'idle' | 'armed' | 'tracking-shot' | 'cooldown'

const START_SPEED_PX_PER_SEC = 360
const START_ACCEL_PX_PER_SEC2 = 1500
const MIN_SHOT_DURATION_MS = 160
const MAX_SHOT_DURATION_MS = 4200
const SLOW_SPEED_PX_PER_SEC = 92
const COOLDOWN_MS = 850

function last<T>(items: T[]): T | undefined {
  return items[items.length - 1]
}

export class ShotDetector {
  state: DetectorState = 'idle'
  private activeTrail: BallObservation[] = []
  private startedAt = 0
  private endedAt = 0
  private playerAtShot?: PlayerTrack
  private contactPoint?: BallObservation
  private lastCompleted?: ShotEvent

  update(input: {
    ball?: BallTrack
    player?: PlayerTrack
    goal: GoalTrack
    profile?: CalibrationProfile
    frame: VisionFrame
  }): ShotEvent | undefined {
    const { ball, player, goal, profile, frame } = input
    if (this.state === 'cooldown') {
      if (frame.timestamp - this.endedAt > COOLDOWN_MS) this.state = 'armed'
      return undefined
    }

    if (!ball || ball.state === 'lost') {
      if (this.state === 'tracking-shot') return this.finish(goal, profile, frame.timestamp, 'Ball lost during shot')
      this.state = 'idle'
      return undefined
    }

    if (this.state === 'idle') {
      this.state = 'armed'
    }

    if (this.state === 'armed' && this.shouldStart(ball, player)) {
      this.state = 'tracking-shot'
      this.startedAt = ball.lastSeenAt
      this.playerAtShot = player
      this.contactPoint = ball.trail[ball.trail.length - 2] ?? last(ball.trail)
      this.activeTrail = ball.trail.slice(-8)
      return undefined
    }

    if (this.state !== 'tracking-shot') return undefined

    const latest = last(ball.trail)
    if (latest && (this.activeTrail.length === 0 || last(this.activeTrail)?.timestamp !== latest.timestamp)) {
      this.activeTrail.push(latest)
    }

    const duration = frame.timestamp - this.startedAt
    const outcome = classifyGoalOutcome(this.activeTrail, goal)
    const leftFrame =
      latest &&
      (latest.x < -ball.radius * 2 || latest.y < -ball.radius * 2 || latest.x > frame.width + ball.radius * 2 || latest.y > frame.height + ball.radius * 2)
    const slowEnough = duration > MIN_SHOT_DURATION_MS && ball.speedPxPerSec < SLOW_SPEED_PX_PER_SEC && this.activeTrail.length >= 5
    const hitGoal = outcome.outcome === 'goal' || outcome.outcome === 'saved-blocked-unclear'

    if (hitGoal || slowEnough || leftFrame || duration > MAX_SHOT_DURATION_MS) {
      return this.finish(goal, profile, frame.timestamp, hitGoal ? 'Goal area reached' : slowEnough ? 'Ball slowed' : leftFrame ? 'Ball left frame' : 'Shot timeout')
    }

    return undefined
  }

  manualMark(ball: BallTrack | undefined, player: PlayerTrack | undefined, frame: VisionFrame): void {
    if (!ball) return
    this.state = 'tracking-shot'
    this.startedAt = frame.timestamp
    this.playerAtShot = player
    this.contactPoint = last(ball.trail)
    this.activeTrail = ball.trail.slice(-10)
  }

  reset(): void {
    this.state = 'idle'
    this.activeTrail = []
    this.startedAt = 0
    this.endedAt = 0
    this.playerAtShot = undefined
    this.contactPoint = undefined
    this.lastCompleted = undefined
  }

  getLastCompleted(): ShotEvent | undefined {
    return this.lastCompleted
  }

  private shouldStart(ball: BallTrack, player?: PlayerTrack): boolean {
    if (ball.trail.length < 3) return false
    const foot = player?.footPosition
    const ballWasNearPlayer = foot ? distance(foot, ball.center) < Math.max(player.box.height * 0.55, 90) : true
    const movingAway = foot ? magnitude(subtract(ball.center, foot)) > magnitude(subtract(ball.trail[ball.trail.length - 3], foot)) + 8 : true
    const suddenKick = ball.speedPxPerSec > START_SPEED_PX_PER_SEC || ball.accelerationPxPerSec2 > START_ACCEL_PX_PER_SEC2
    return ball.confidence.score > 0.18 && ballWasNearPlayer && movingAway && suddenKick
  }

  private finish(goal: GoalTrack, profile: CalibrationProfile | undefined, endedAt: number, reason: string): ShotEvent | undefined {
    if (this.activeTrail.length < 2) {
      this.state = 'cooldown'
      this.endedAt = endedAt
      return undefined
    }

    const { outcome, metrics } = buildShotMetrics(this.activeTrail, goal, profile)
    const durationMs = Math.max(1, endedAt - this.startedAt)
    let peak = 0
    for (let i = 1; i < this.activeTrail.length; i++) {
      const dt = Math.max(16, this.activeTrail[i].timestamp - this.activeTrail[i - 1].timestamp) / 1000
      peak = Math.max(peak, distance(this.activeTrail[i - 1], this.activeTrail[i]) / dt)
    }
    const averageSpeedPxPerSec = this.activeTrail.length > 1 ? distance(this.activeTrail[0], last(this.activeTrail)!) / (durationMs / 1000) : 0
    const trackingConfidence = this.activeTrail.reduce((sum, p) => sum + p.confidence, 0) / this.activeTrail.length
    const shot: ShotEvent = {
      id: `shot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      startedAt: this.startedAt,
      endedAt,
      startPosition: this.activeTrail[0],
      endPosition: last(this.activeTrail)!,
      contactPoint: this.contactPoint,
      playerPosition: this.playerAtShot?.footPosition ?? this.playerAtShot?.center,
      ballTrail: [...this.activeTrail],
      outcome,
      confidence: combineConfidence([
        { score: trackingConfidence, weight: 0.38, reason: 'Ball trail confidence' },
        { score: metrics.quality.confidence.score, weight: 0.32, reason: 'Metric confidence' },
        { score: goal.confidence.score, weight: 0.18, reason: 'Goal confidence' },
        { score: this.playerAtShot?.confidence.score ?? 0.34, weight: 0.12, reason: this.playerAtShot ? 'Player near shot' : 'No player lock' },
      ]),
      metrics,
      raw: {
        durationMs,
        peakSpeedPxPerSec: Math.round(peak),
        averageSpeedPxPerSec: Math.round(averageSpeedPxPerSec),
        frameCount: this.activeTrail.length,
      },
    }

    if (shot.confidence.reasons.indexOf(reason) === -1) {
      shot.confidence = confidence(shot.confidence.score, [...shot.confidence.reasons, reason])
    }

    this.lastCompleted = shot
    this.activeTrail = []
    this.startedAt = 0
    this.playerAtShot = undefined
    this.contactPoint = undefined
    this.state = 'cooldown'
    this.endedAt = endedAt
    return shot
  }
}
