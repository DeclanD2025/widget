import { confidence } from './confidence'
import { boxCenter, boxFromPoints, distance, scaleBox, scalePoint } from './geometry'
import { loadVisionModels } from './modelLoader'
import type {
  BoundingBox,
  Detection,
  ModelStatus,
  PerformanceMode,
  Point2D,
  PoseKeypoint,
  VisionFrame,
} from './types'

type Pose = import('@tensorflow-models/pose-detection').Pose
type ObjectDetection = import('@tensorflow-models/coco-ssd').DetectedObject

const PROCESS_EVERY: Record<PerformanceMode, number> = {
  'high-accuracy': 2,
  balanced: 4,
  lightweight: 8,
}

const MOTION_W = 160
const MOTION_H = 90

interface MotionCandidate {
  box: BoundingBox
  center: Point2D
  score: number
}

export interface DetectionResult {
  detections: Detection[]
  modelStatus: ModelStatus
  processedByModel: boolean
}

export class DetectionEngine {
  private motionCanvas: HTMLCanvasElement
  private motionCtx: CanvasRenderingContext2D
  private previousMotion?: ImageData
  private lastModelDetections: Detection[] = []
  private modelStatus: ModelStatus = { pose: 'idle', object: 'idle' }

  constructor() {
    this.motionCanvas = document.createElement('canvas')
    this.motionCanvas.width = MOTION_W
    this.motionCanvas.height = MOTION_H
    const ctx = this.motionCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    this.motionCtx = ctx
  }

  async detect(video: HTMLVideoElement, frame: VisionFrame, mode: PerformanceMode): Promise<DetectionResult> {
    const motion = this.detectMotion(video, frame)
    const shouldRunModel = mode !== 'lightweight' && frame.index % PROCESS_EVERY[mode] === 0
    const detections = [...motion]

    if (shouldRunModel) {
      const models = await loadVisionModels(mode)
      this.modelStatus = models.status
      const modelDetections: Detection[] = []

      if (models.pose) {
        try {
          const poses = await models.pose.estimatePoses(video, { flipHorizontal: false })
          modelDetections.push(...poses.flatMap((pose, index) => this.poseToDetections(pose, index, frame)))
        } catch (error) {
          this.modelStatus = {
            ...this.modelStatus,
            pose: 'failed',
            error: error instanceof Error ? error.message : 'Pose model failed',
          }
        }
      }

      if (models.object) {
        try {
          const predictions = await models.object.detect(video)
          modelDetections.push(...predictions.flatMap((prediction, index) => this.objectToDetection(prediction, index, frame)))
        } catch (error) {
          this.modelStatus = {
            ...this.modelStatus,
            object: 'failed',
            error: error instanceof Error ? error.message : 'Object model failed',
          }
        }
      }

      this.lastModelDetections = modelDetections
      detections.push(...modelDetections)
    } else {
      detections.push(...this.lastModelDetections)
    }

    return {
      detections,
      modelStatus: this.modelStatus,
      processedByModel: shouldRunModel,
    }
  }

  reset(): void {
    this.previousMotion = undefined
    this.lastModelDetections = []
  }

  private poseToDetections(pose: Pose, index: number, frame: VisionFrame): Detection[] {
    const keypoints: PoseKeypoint[] = pose.keypoints
      .filter((kp) => (kp.score ?? 0) > 0.2)
      .map((kp) => ({
        name: kp.name ?? `kp-${index}`,
        x: kp.x,
        y: kp.y,
        score: kp.score ?? 0,
      }))

    if (keypoints.length < 5) return []
    const box = boxFromPoints(keypoints, 18)
    const avgScore = keypoints.reduce((sum, kp) => sum + kp.score, 0) / keypoints.length
    return [
      {
        id: `pose-${frame.index}-${index}`,
        label: 'person',
        source: 'pose-model',
        score: confidence(avgScore, ['MoveNet pose']).score,
        box,
        center: boxCenter(box),
        keypoints,
        timestamp: frame.timestamp,
      },
    ]
  }

  private objectToDetection(prediction: ObjectDetection, index: number, frame: VisionFrame): Detection[] {
    const [x, y, width, height] = prediction.bbox
    const rawBox = { x, y, width, height }
    const className = prediction.class.toLowerCase()
    const label = className === 'person' ? 'person' : className === 'sports ball' ? 'sports-ball' : 'unknown'
    if (label === 'unknown') return []

    const box = scaleBox(rawBox, { width: frame.width, height: frame.height }, { width: frame.width, height: frame.height })
    return [
      {
        id: `object-${frame.index}-${index}`,
        label,
        source: 'object-model',
        score: prediction.score,
        box,
        center: boxCenter(box),
        radius: label === 'sports-ball' ? Math.max(6, Math.min(box.width, box.height) / 2) : undefined,
        timestamp: frame.timestamp,
      },
    ]
  }

  private detectMotion(video: HTMLVideoElement, frame: VisionFrame): Detection[] {
    this.motionCtx.drawImage(video, 0, 0, MOTION_W, MOTION_H)
    const current = this.motionCtx.getImageData(0, 0, MOTION_W, MOTION_H)
    const previous = this.previousMotion
    this.previousMotion = current
    if (!previous) return []

    const candidates = this.findMotionCandidates(previous, current)
    return candidates.map((candidate, index) => {
      const box = scaleBox(candidate.box, { width: MOTION_W, height: MOTION_H }, { width: frame.width, height: frame.height })
      const center = scalePoint(candidate.center, { width: MOTION_W, height: MOTION_H }, { width: frame.width, height: frame.height })
      const size = Math.min(box.width, box.height)
      return {
        id: `motion-${frame.index}-${index}`,
        label: size < Math.min(frame.width, frame.height) * 0.18 ? 'sports-ball' : 'motion',
        source: 'motion',
        score: candidate.score,
        box,
        center,
        radius: Math.max(5, size / 2),
        timestamp: frame.timestamp,
      }
    })
  }

  private findMotionCandidates(previous: ImageData, current: ImageData): MotionCandidate[] {
    const visited = new Uint8Array(MOTION_W * MOTION_H)
    const active = new Uint8Array(MOTION_W * MOTION_H)
    const threshold = 42

    for (let y = 0; y < MOTION_H; y += 1) {
      for (let x = 0; x < MOTION_W; x += 1) {
        const i = (y * MOTION_W + x) * 4
        const diff =
          Math.abs(current.data[i] - previous.data[i]) +
          Math.abs(current.data[i + 1] - previous.data[i + 1]) +
          Math.abs(current.data[i + 2] - previous.data[i + 2])
        if (diff > threshold) active[y * MOTION_W + x] = 1
      }
    }

    const candidates: MotionCandidate[] = []
    const queue: Point2D[] = []
    const neighbours = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]

    for (let y = 0; y < MOTION_H; y += 1) {
      for (let x = 0; x < MOTION_W; x += 1) {
        const startIndex = y * MOTION_W + x
        if (!active[startIndex] || visited[startIndex]) continue
        queue.length = 0
        queue.push({ x, y })
        visited[startIndex] = 1

        let minX = x
        let maxX = x
        let minY = y
        let maxY = y
        let count = 0

        while (queue.length > 0) {
          const p = queue.pop()!
          count += 1
          minX = Math.min(minX, p.x)
          maxX = Math.max(maxX, p.x)
          minY = Math.min(minY, p.y)
          maxY = Math.max(maxY, p.y)

          for (const n of neighbours) {
            const nx = p.x + n.x
            const ny = p.y + n.y
            if (nx < 0 || ny < 0 || nx >= MOTION_W || ny >= MOTION_H) continue
            const ni = ny * MOTION_W + nx
            if (!active[ni] || visited[ni]) continue
            visited[ni] = 1
            queue.push({ x: nx, y: ny })
          }
        }

        if (count < 6) continue
        const box = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        const squareness = Math.min(box.width, box.height) / Math.max(box.width, box.height, 1)
        const area = box.width * box.height
        const density = count / Math.max(1, area)
        const compactness = Math.max(0, Math.min(1, squareness * 0.7 + density * 0.3))
        const centre = { x: minX + box.width / 2, y: minY + box.height / 2 }
        const centreMove = this.previousMotion ? 1 : 0.5
        const score = Math.min(0.78, 0.2 + compactness * 0.45 + Math.min(count / 160, 1) * 0.25 + centreMove * 0.05)
        candidates.push({ box, center: centre, score })
      }
    }

    return candidates
      .sort((a, b) => b.score - a.score || distance(b.center, { x: MOTION_W / 2, y: MOTION_H / 2 }) - distance(a.center, { x: MOTION_W / 2, y: MOTION_H / 2 }))
      .slice(0, 4)
  }
}
