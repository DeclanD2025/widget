import { combineConfidence, confidence } from './confidence'
import { distance, magnitude } from './geometry'
import type { BallObservation, BallTrack, Detection, Point2D, VisionFrame } from './types'

const TRAIL_LIMIT = 80
const MAX_LOST_FRAMES = 18
const SMOOTHING_ALPHA = 0.42

function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha
}

function smoothObservation(previous: BallObservation, next: BallObservation, alpha: number): BallObservation {
  return {
    ...next,
    x: lerp(previous.x, next.x, alpha),
    y: lerp(previous.y, next.y, alpha),
    radius: lerp(previous.radius, next.radius, alpha),
    confidence: Math.max(next.confidence, previous.confidence * 0.82),
  }
}

function isBallCandidate(detection: Detection): boolean {
  return detection.label === 'sports-ball' && Boolean(detection.center)
}

function observationFromDetection(detection: Detection): BallObservation {
  const centre = detection.center!
  return {
    x: centre.x,
    y: centre.y,
    timestamp: detection.timestamp,
    confidence: detection.score,
    radius: detection.radius ?? Math.max(5, Math.min(detection.box?.width ?? 14, detection.box?.height ?? 14) / 2),
    source: detection.source,
  }
}

export class BallTracker {
  private current?: BallTrack
  private manualPoint?: Point2D

  lockAt(point: Point2D, frame: VisionFrame): BallTrack {
    this.manualPoint = point
    const observation: BallObservation = {
      ...point,
      timestamp: frame.timestamp,
      confidence: 0.54,
      radius: Math.max(8, Math.min(frame.width, frame.height) * 0.018),
      source: 'manual',
    }
    this.current = this.trackFromObservation(observation, 'manual')
    return this.current
  }

  clearManualLock(): void {
    this.manualPoint = undefined
  }

  update(detections: Detection[], frame: VisionFrame): BallTrack | undefined {
    const ballDetections = detections.filter(isBallCandidate)
    const chosen = this.chooseBall(ballDetections, frame)
    if (chosen && this.isPlausible(chosen, frame)) {
      const observation = observationFromDetection(chosen)
      this.current = this.trackFromObservation(observation, chosen.source === 'manual' ? 'manual' : 'detected')
      return this.current
    }

    if (this.manualPoint) {
      const observation: BallObservation = {
        ...this.manualPoint,
        timestamp: frame.timestamp,
        confidence: 0.38,
        radius: Math.max(7, Math.min(frame.width, frame.height) * 0.018),
        source: 'manual',
      }
      this.current = this.trackFromObservation(observation, 'manual')
      return this.current
    }

    if (!this.current) return undefined
    const lostFrames = this.current.lostFrames + 1
    if (lostFrames > MAX_LOST_FRAMES) {
      this.current = {
        ...this.current,
        confidence: confidence(0.05, ['Ball lost']),
        state: 'lost',
        lostFrames,
      }
      return this.current
    }

    const predicted = {
      x: this.current.center.x + this.current.velocity.x * 0.06,
      y: this.current.center.y + this.current.velocity.y * 0.06,
      timestamp: frame.timestamp,
      confidence: Math.max(0.12, this.current.confidence.score * 0.72),
      radius: this.current.radius,
      source: 'motion' as const,
    }
    this.current = this.trackFromObservation(predicted, 'predicted', lostFrames)
    return this.current
  }

  private chooseBall(candidates: Detection[], frame: VisionFrame): Detection | undefined {
    if (candidates.length === 0) return undefined
    const ranked = candidates
      .map((candidate) => {
        const centre = candidate.center!
        const continuity = this.current ? Math.max(0, 1 - distance(centre, this.current.center) / Math.max(frame.width, frame.height)) : 0.45
        const size = candidate.radius ? candidate.radius * 2 : Math.min(candidate.box?.width ?? 12, candidate.box?.height ?? 12)
        const sizeScore = 1 - Math.min(1, Math.abs(size - Math.min(frame.width, frame.height) * 0.045) / 90)
        const sourceBoost = candidate.source === 'object-model' ? 0.18 : candidate.source === 'motion' ? 0.08 : 0.12
        return {
          candidate,
          rank: candidate.score * 0.45 + continuity * 0.32 + sizeScore * 0.15 + sourceBoost,
        }
      })
      .sort((a, b) => b.rank - a.rank)[0]?.candidate

    if (!ranked) return undefined
    const threshold = this.current ? 0.42 : 0.5
    return this.rankCandidate(ranked, frame) >= threshold ? ranked : undefined
  }

  private rankCandidate(candidate: Detection, frame: VisionFrame): number {
    const centre = candidate.center!
    const continuity = this.current ? Math.max(0, 1 - distance(centre, this.current.center) / Math.max(frame.width, frame.height)) : 0.45
    const size = candidate.radius ? candidate.radius * 2 : Math.min(candidate.box?.width ?? 12, candidate.box?.height ?? 12)
    const sizeScore = 1 - Math.min(1, Math.abs(size - Math.min(frame.width, frame.height) * 0.045) / 90)
    const sourceBoost = candidate.source === 'object-model' ? 0.18 : candidate.source === 'motion' ? 0.08 : 0.12
    return candidate.score * 0.45 + continuity * 0.32 + sizeScore * 0.15 + sourceBoost
  }

  private isPlausible(candidate: Detection, frame: VisionFrame): boolean {
    if (!this.current || !candidate.center) return true
    const dt = Math.max(16, candidate.timestamp - this.current.lastSeenAt) / 1000
    const jump = distance(candidate.center, this.current.center)
    const frameDiag = Math.hypot(frame.width, frame.height)
    const generousShotJump = Math.max(frameDiag * 0.18, this.current.speedPxPerSec * dt * 2.4 + 70)
    if (candidate.source === 'object-model' && candidate.score > 0.58) return jump < frameDiag * 0.42
    return jump < generousShotJump
  }

  private trackFromObservation(observation: BallObservation, state: BallTrack['state'], lostFrames = 0): BallTrack {
    const previous = this.current
    const previousObservation = previous?.trail[previous.trail.length - 1]
    const smoothed = previousObservation && state !== 'manual' ? smoothObservation(previousObservation, observation, state === 'predicted' ? 0.25 : SMOOTHING_ALPHA) : observation
    const dt = previousObservation ? Math.max(16, smoothed.timestamp - previousObservation.timestamp) / 1000 : 1
    const velocity = previousObservation ? { x: (smoothed.x - previousObservation.x) / dt, y: (smoothed.y - previousObservation.y) / dt } : { x: 0, y: 0 }
    const previousVelocity = previous?.velocity ?? { x: 0, y: 0 }
    const acceleration = {
      x: (velocity.x - previousVelocity.x) / dt,
      y: (velocity.y - previousVelocity.y) / dt,
    }
    const trail = [...(previous?.trail ?? []), smoothed].slice(-TRAIL_LIMIT)
    const continuity = previous ? Math.max(0, 1 - distance(smoothed, previous.center) / 260) : 0.48
    const speed = magnitude(velocity)
    const accelerationSpeed = magnitude(acceleration)
    const trackConfidence = combineConfidence([
      { score: smoothed.confidence, weight: 0.5, reason: smoothed.source === 'object-model' ? 'Model saw sports ball' : smoothed.source === 'motion' ? 'Motion candidate' : 'Manual ball lock' },
      { score: continuity, weight: 0.28, reason: 'Trail continuity' },
      { score: trail.length >= 4 ? 0.76 : 0.42, weight: 0.14, reason: trail.length >= 4 ? 'Ball trail established' : 'New ball trail' },
      { score: state === 'predicted' ? 0.22 : 0.65, weight: 0.08, reason: state === 'predicted' ? 'Predicted after missed frame' : 'Current frame detection' },
    ])

    return {
      id: previous?.id ?? 'active-ball',
      center: { x: smoothed.x, y: smoothed.y },
      radius: smoothed.radius,
      trail,
      velocity,
      acceleration,
      speedPxPerSec: speed,
      accelerationPxPerSec2: accelerationSpeed,
      confidence: trackConfidence,
      state,
      source: smoothed.source,
      lastSeenAt: smoothed.timestamp,
      lostFrames,
    }
  }
}
