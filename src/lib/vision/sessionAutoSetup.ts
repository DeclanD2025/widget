import { boxArea, boxCenter, distance } from './geometry'
import { isHumanLikePlayerDetection, playerDetectionScore } from './playerTracker'
import type { BallTrack, Detection, GoalTrack, PlayerTrack, VisionAutoSetupSignal, VisionAutoSetupState, VisionFrame } from './types'

const STABLE_LOCK_FRAMES = 6
const STABLE_LOCK_AGE_MS = 420
const CANDIDATE_MEMORY_MS = 700

interface StableCandidate {
  detection: Detection
  center: { x: number; y: number }
  area: number
  seenFrames: number
  firstSeenAt: number
  lastSeenAt: number
}

interface RankedPerson {
  detection: Detection
  rank: number
}

export const EMPTY_AUTO_SETUP_STATE: VisionAutoSetupState = {
  player: { status: 'idle', confidence: 0, message: 'Start vision to auto-lock player' },
  ball: { status: 'idle', confidence: 0, message: 'Waiting for camera' },
  goal: { status: 'idle', confidence: 0, message: 'Waiting for calibration' },
  ready: false,
  messages: ['Start vision and let the player stand in frame.'],
}

export interface SessionAutoSetupInput {
  detections: Detection[]
  frame: VisionFrame
  player?: PlayerTrack
  ball?: BallTrack
  goal?: GoalTrack
}

export interface SessionAutoSetupResult {
  state: VisionAutoSetupState
  playerLock?: Detection
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function signal(status: VisionAutoSetupSignal['status'], confidence: number, message: string): VisionAutoSetupSignal {
  return { status, confidence: clamp01(confidence), message }
}

function isActivePlayer(player?: PlayerTrack): boolean {
  return Boolean(player && player.state !== 'lost' && player.confidence.score >= 0.34)
}

function rankPerson(detection: Detection, frame: VisionFrame): number {
  const box = detection.box
  if (!box) return 0
  const center = detection.center ?? boxCenter(box)
  const areaScore = clamp01(boxArea(box) / Math.max(1, frame.width * frame.height * 0.22))
  const centrality = clamp01(1 - distance(center, { x: frame.width / 2, y: frame.height / 2 }) / Math.max(frame.width, frame.height))
  return playerDetectionScore(detection) * 0.55 + areaScore * 0.3 + centrality * 0.15
}

function isSameStableCandidate(previous: StableCandidate, detection: Detection): boolean {
  if (!detection.box) return false
  const center = detection.center ?? boxCenter(detection.box)
  const area = boxArea(detection.box)
  const maxMove = Math.max(42, Math.min(detection.box.width, detection.box.height) * 0.62)
  const areaRatio = area / Math.max(1, previous.area)
  return distance(previous.center, center) <= maxMove && areaRatio >= 0.52 && areaRatio <= 1.92
}

function rankedPeople(detections: Detection[], frame: VisionFrame): RankedPerson[] {
  return detections
    .filter((detection) => detection.label === 'person' && detection.box && isHumanLikePlayerDetection(detection, frame))
    .map((detection) => ({ detection, rank: rankPerson(detection, frame) }))
    .sort((a, b) => b.rank - a.rank)
}

export class SessionAutoSetup {
  private playerCandidate?: StableCandidate

  reset(): void {
    this.playerCandidate = undefined
  }

  update(input: SessionAutoSetupInput): SessionAutoSetupResult {
    const playerResult = this.updatePlayer(input)
    return {
      state: this.describe(input, playerResult.player),
      playerLock: playerResult.playerLock,
    }
  }

  describe(input: Pick<SessionAutoSetupInput, 'player' | 'ball' | 'goal'>, playerSignal?: VisionAutoSetupSignal): VisionAutoSetupState {
    const player = playerSignal ?? this.describePlayer(input.player)
    const ball = this.describeBall(input.ball)
    const goal = this.describeGoal(input.goal)
    const ready = player.status === 'locked' && goal.status === 'locked'
    const messages = [player.message, goal.message, ball.message].filter(Boolean).slice(0, 3)

    return { player, ball, goal, ready, messages }
  }

  private updatePlayer(input: SessionAutoSetupInput): { player: VisionAutoSetupSignal; playerLock?: Detection } {
    if (isActivePlayer(input.player)) {
      this.playerCandidate = undefined
      return { player: this.describePlayer(input.player) }
    }

    const people = rankedPeople(input.detections, input.frame)
    if (people.length === 0) {
      if (this.playerCandidate && input.frame.timestamp - this.playerCandidate.lastSeenAt < CANDIDATE_MEMORY_MS) {
        return { player: signal('locking', this.playerCandidate.seenFrames / STABLE_LOCK_FRAMES, 'Holding player candidate briefly') }
      }
      this.playerCandidate = undefined
      return { player: signal('scanning', 0.18, 'Scanning for one stable player') }
    }

    const [best, second] = people
    if (second && second.rank > best.rank * 0.82) {
      this.playerCandidate = undefined
      return { player: signal('blocked', 0.34, 'Multiple people in frame') }
    }

    const detection = best.detection
    const box = detection.box!
    const center = detection.center ?? boxCenter(box)
    const area = boxArea(box)
    if (this.playerCandidate && isSameStableCandidate(this.playerCandidate, detection)) {
      this.playerCandidate = {
        detection,
        center,
        area,
        seenFrames: this.playerCandidate.seenFrames + 1,
        firstSeenAt: this.playerCandidate.firstSeenAt,
        lastSeenAt: input.frame.timestamp,
      }
    } else {
      this.playerCandidate = {
        detection,
        center,
        area,
        seenFrames: 1,
        firstSeenAt: input.frame.timestamp,
        lastSeenAt: input.frame.timestamp,
      }
    }

    const stableAge = input.frame.timestamp - this.playerCandidate.firstSeenAt
    const stableScore = clamp01(this.playerCandidate.seenFrames / STABLE_LOCK_FRAMES)
    const confidence = stableScore * 0.62 + playerDetectionScore(detection) * 0.38
    if (this.playerCandidate.seenFrames >= STABLE_LOCK_FRAMES && stableAge >= STABLE_LOCK_AGE_MS) {
      const playerLock = this.playerCandidate.detection
      this.playerCandidate = undefined
      return { player: signal('locked', confidence, 'Player auto-lock ready'), playerLock }
    }

    return { player: signal('locking', confidence, 'Stabilising player lock') }
  }

  private describePlayer(player?: PlayerTrack): VisionAutoSetupSignal {
    if (!player) return signal('scanning', 0.12, 'Scanning for one stable player')
    if (player.state === 'lost') return signal('scanning', Math.max(0.08, player.confidence.score), 'Player left frame; scanning again')
    if (player.selectedByUser) return signal('locked', player.confidence.score, 'Manual player lock active')
    return signal('locked', player.confidence.score, 'Player auto-locked')
  }

  private describeBall(ball?: BallTrack): VisionAutoSetupSignal {
    if (!ball) return signal('scanning', 0.14, 'Scanning for ball')
    if (ball.state === 'lost') return signal('scanning', Math.max(0.08, ball.confidence.score), 'Ball lost; scanning again')
    return signal('locked', ball.confidence.score, 'Ball locked')
  }

  private describeGoal(goal?: GoalTrack): VisionAutoSetupSignal {
    if (!goal || !goal.calibrated) return signal('needs-manual', goal?.confidence.score ?? 0.1, 'Goal lock needed')
    return signal('locked', goal.confidence.score, 'Goal calibrated')
  }
}
