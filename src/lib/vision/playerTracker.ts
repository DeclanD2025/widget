import { combineConfidence, confidence } from './confidence'
import { angleDeg, boxArea, boxCenter, distance, midpoint, pointInBox, subtract } from './geometry'
import type { BallTrack, BoundingBox, Detection, PlayerTrack, Point2D, PoseKeypoint, VisionFrame } from './types'

const MAX_LOST_FRAMES = 24

function bottomCentre(box: BoundingBox): Point2D {
  return { x: box.x + box.width / 2, y: box.y + box.height }
}

function keypoint(keypoints: PoseKeypoint[], name: string): PoseKeypoint | undefined {
  return keypoints.find((kp) => kp.name === name && kp.score > 0.2)
}

function estimateFootPosition(box: BoundingBox, keypoints: PoseKeypoint[]): Point2D {
  const left = keypoint(keypoints, 'left_ankle')
  const right = keypoint(keypoints, 'right_ankle')
  if (left && right) return midpoint(left, right)
  return bottomCentre(box)
}

function detectionScore(detection: Detection): number {
  const poseScore = detection.keypoints?.length ? detection.keypoints.reduce((sum, kp) => sum + kp.score, 0) / detection.keypoints.length : 0
  return Math.max(detection.score, poseScore)
}

export class PlayerTracker {
  private current?: PlayerTrack
  private selectedByUser = false
  private manualPoint?: Point2D

  selectAt(point: Point2D, detections: Detection[]): void {
    const person = detections
      .filter((detection) => detection.label === 'person' && detection.box)
      .sort((a, b) => {
        const aDistance = a.box && pointInBox(point, a.box) ? 0 : distance(a.center ?? boxCenter(a.box!), point)
        const bDistance = b.box && pointInBox(point, b.box) ? 0 : distance(b.center ?? boxCenter(b.box!), point)
        return aDistance - bDistance
      })[0]

    if (person?.box) {
      this.current = this.trackFromDetection(person, undefined, true)
      this.selectedByUser = true
      this.manualPoint = undefined
      return
    }

    this.manualPoint = point
    this.selectedByUser = true
  }

  clearSelection(): void {
    this.selectedByUser = false
    this.manualPoint = undefined
  }

  update(detections: Detection[], frame: VisionFrame, ball?: BallTrack): PlayerTrack | undefined {
    const people = detections.filter((detection) => detection.label === 'person' && detection.box)
    const best = this.choosePlayer(people, frame)
    if (best) {
      const next = this.trackFromDetection(best, this.current, this.selectedByUser)
      next.approachAngleDeg = ball ? angleDeg(subtract(ball.center, next.footPosition ?? next.center)) : undefined
      this.current = next
      return next
    }

    if (this.manualPoint) {
      const size = Math.max(frame.height * 0.22, 80)
      const box: BoundingBox = {
        x: this.manualPoint.x - size * 0.25,
        y: this.manualPoint.y - size * 0.88,
        width: size * 0.5,
        height: size,
      }
      this.current = {
        id: 'manual-player',
        box,
        center: boxCenter(box),
        keypoints: [],
        footPosition: this.manualPoint,
        velocity: { x: 0, y: 0 },
        confidence: confidence(0.42, ['Manual player marker']),
        selectedByUser: true,
        state: 'manual',
        lastSeenAt: frame.timestamp,
        lostFrames: 0,
      }
      return this.current
    }

    if (!this.current) return undefined
    const lostFrames = this.current.lostFrames + 1
    if (lostFrames > MAX_LOST_FRAMES) {
      this.current = {
        ...this.current,
        confidence: confidence(0.08, ['Player lost']),
        state: 'lost',
        lostFrames,
      }
      return this.current
    }

    const predictedCentre = {
      x: this.current.center.x + this.current.velocity.x * 0.1,
      y: this.current.center.y + this.current.velocity.y * 0.1,
    }
    const box = {
      ...this.current.box,
      x: predictedCentre.x - this.current.box.width / 2,
      y: predictedCentre.y - this.current.box.height / 2,
    }
    this.current = {
      ...this.current,
      box,
      center: predictedCentre,
      confidence: confidence(Math.max(0.12, this.current.confidence.score * 0.86), ['Predicted after missed person detection']),
      state: 'predicted',
      lostFrames,
    }
    return this.current
  }

  private choosePlayer(people: Detection[], frame: VisionFrame): Detection | undefined {
    if (people.length === 0) return undefined
    const centre = { x: frame.width / 2, y: frame.height / 2 }
    return people
      .map((person) => {
        const box = person.box!
        const personCentre = person.center ?? boxCenter(box)
        const continuity = this.current ? Math.max(0, 1 - distance(personCentre, this.current.center) / Math.max(frame.width, frame.height)) : 0.45
        const centrality = Math.max(0, 1 - distance(personCentre, centre) / Math.max(frame.width, frame.height))
        const sizeScore = Math.min(1, boxArea(box) / Math.max(1, frame.width * frame.height * 0.28))
        const selectedBoost = this.selectedByUser && this.current ? 0.2 : 0
        return {
          person,
          rank: detectionScore(person) * 0.45 + continuity * 0.25 + centrality * 0.15 + sizeScore * 0.15 + selectedBoost,
        }
      })
      .sort((a, b) => b.rank - a.rank)[0]?.person
  }

  private trackFromDetection(detection: Detection, previous: PlayerTrack | undefined, selectedByUser: boolean): PlayerTrack {
    const box = detection.box!
    const centre = detection.center ?? boxCenter(box)
    const dt = previous ? Math.max(16, detection.timestamp - previous.lastSeenAt) / 1000 : 1
    const velocity = previous ? { x: (centre.x - previous.center.x) / dt, y: (centre.y - previous.center.y) / dt } : { x: 0, y: 0 }
    const keypoints = detection.keypoints ?? []
    const footPosition = estimateFootPosition(box, keypoints)
    const confidenceValue = combineConfidence([
      { score: detection.score, weight: 0.48, reason: detection.source === 'pose-model' ? 'Pose model found player' : 'Object model found person' },
      { score: keypoints.length / 17, weight: 0.24, reason: keypoints.length ? 'Body keypoints visible' : 'No pose keypoints' },
      { score: selectedByUser ? 0.85 : 0.58, weight: 0.18, reason: selectedByUser ? 'Caiden confirmed by tap' : 'Main player chosen automatically' },
      { score: previous ? 0.8 : 0.55, weight: 0.1, reason: previous ? 'Track continuity' : 'New player track' },
    ])

    return {
      id: previous?.id ?? 'active-player',
      box,
      center: centre,
      keypoints,
      footPosition,
      velocity,
      confidence: confidenceValue,
      selectedByUser,
      state: detection.source === 'manual' ? 'manual' : 'detected',
      lastSeenAt: detection.timestamp,
      lostFrames: 0,
    }
  }
}
