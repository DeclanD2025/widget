import { combineConfidence, confidence } from './confidence'
import { angleDeg, boxArea, boxCenter, distance, midpoint, pointInBox, subtract } from './geometry'
import type { BallTrack, BoundingBox, Detection, PlayerTrack, Point2D, PoseKeypoint, VisionFrame } from './types'

const MAX_LOST_FRAMES = 12
const SELECTED_MAX_LOST_FRAMES = 8
const MIN_PERSON_SCORE = 0.34

function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha
}

function smoothPoint(previous: Point2D, next: Point2D, alpha: number): Point2D {
  return {
    x: lerp(previous.x, next.x, alpha),
    y: lerp(previous.y, next.y, alpha),
  }
}

function smoothBox(previous: BoundingBox, next: BoundingBox, alpha: number): BoundingBox {
  return {
    x: lerp(previous.x, next.x, alpha),
    y: lerp(previous.y, next.y, alpha),
    width: lerp(previous.width, next.width, alpha),
    height: lerp(previous.height, next.height, alpha),
  }
}

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

function isHumanLike(detection: Detection, frame: VisionFrame): boolean {
  if (!detection.box) return false
  const score = detectionScore(detection)
  if (score < MIN_PERSON_SCORE) return false
  const { width, height } = detection.box
  if (width <= 12 || height <= 28) return false
  const aspect = width / Math.max(1, height)
  if (aspect < 0.16 || aspect > 0.92) return false
  const area = boxArea(detection.box)
  const frameArea = frame.width * frame.height
  if (area < frameArea * 0.006 || area > frameArea * 0.72) return false
  if (detection.source === 'pose-model') {
    const keypoints = detection.keypoints ?? []
    const strongKeypoints = keypoints.filter((kp) => kp.score > 0.28).length
    const lowerBody = keypoints.some((kp) => ['left_ankle', 'right_ankle', 'left_knee', 'right_knee', 'left_hip', 'right_hip'].includes(kp.name) && kp.score > 0.22)
    return strongKeypoints >= 5 && lowerBody
  }
  return detection.score >= 0.46
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
    const people = detections.filter((detection) => detection.label === 'person' && detection.box && isHumanLike(detection, frame))
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
    const maxLost = this.selectedByUser ? SELECTED_MAX_LOST_FRAMES : MAX_LOST_FRAMES
    if (lostFrames > maxLost) {
      this.current = {
        ...this.current,
        confidence: confidence(0.04, [this.selectedByUser ? 'Caiden left frame or body lock lost' : 'Player lost']),
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
      confidence: confidence(Math.max(0.08, this.current.confidence.score * (this.selectedByUser ? 0.62 : 0.76)), ['Briefly predicting player position']),
      state: 'predicted',
      lostFrames,
    }
    return this.current
  }

  private choosePlayer(people: Detection[], frame: VisionFrame): Detection | undefined {
    if (people.length === 0) return undefined
    const centre = { x: frame.width / 2, y: frame.height / 2 }
    const ranked = people
      .map((person) => {
        const box = person.box!
        const personCentre = person.center ?? boxCenter(box)
        const maxFollowDistance = this.current ? Math.max(this.current.box.height * 0.85, Math.min(frame.width, frame.height) * 0.18) : Math.max(frame.width, frame.height)
        const continuityDistance = this.current ? distance(personCentre, this.current.center) : 0
        const continuity = this.current ? Math.max(0, 1 - continuityDistance / maxFollowDistance) : 0.45
        const sizeRatio = this.current ? boxArea(box) / Math.max(1, boxArea(this.current.box)) : 1
        const centrality = Math.max(0, 1 - distance(personCentre, centre) / Math.max(frame.width, frame.height))
        const sizeScore = Math.min(1, boxArea(box) / Math.max(1, frame.width * frame.height * 0.28))
        const selectedBoost = this.selectedByUser && this.current ? 0.2 : 0
        const selectedMismatch = this.selectedByUser && this.current && (continuityDistance > maxFollowDistance || sizeRatio < 0.42 || sizeRatio > 2.35)
        return {
          person,
          rank: selectedMismatch ? -1 : detectionScore(person) * 0.42 + continuity * 0.32 + centrality * 0.1 + sizeScore * 0.12 + selectedBoost,
        }
      })
      .sort((a, b) => b.rank - a.rank)

    const best = ranked[0]
    if (!best || best.rank < (this.selectedByUser && this.current ? 0.5 : 0.46)) return undefined
    return best.person
  }

  private trackFromDetection(detection: Detection, previous: PlayerTrack | undefined, selectedByUser: boolean): PlayerTrack {
    const rawBox = detection.box!
    const rawCentre = detection.center ?? boxCenter(rawBox)
    const alpha = previous ? (selectedByUser ? 0.34 : 0.46) : 1
    const box = previous ? smoothBox(previous.box, rawBox, alpha) : rawBox
    const centre = previous ? smoothPoint(previous.center, rawCentre, alpha) : rawCentre
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
