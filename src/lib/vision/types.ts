export interface Point2D {
  x: number
  y: number
}

export interface Vector2D {
  x: number
  y: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type Polygon = Point2D[]

export type DetectionLabel =
  | 'person'
  | 'sports-ball'
  | 'goal'
  | 'motion'
  | 'manual-player'
  | 'manual-ball'
  | 'unknown'

export type DetectionSource = 'pose-model' | 'object-model' | 'motion' | 'manual' | 'calibration'

export type ConfidenceBand = 'high' | 'medium' | 'low' | 'very-low'

export interface TrackingConfidence {
  score: number
  band: ConfidenceBand
  reasons: string[]
}

export interface PoseKeypoint extends Point2D {
  name: string
  score: number
}

export interface Detection {
  id: string
  label: DetectionLabel
  source: DetectionSource
  score: number
  box?: BoundingBox
  center?: Point2D
  radius?: number
  keypoints?: PoseKeypoint[]
  timestamp: number
}

export interface BallObservation extends Point2D {
  timestamp: number
  confidence: number
  radius: number
  source: DetectionSource
}

export type TrackState = 'idle' | 'detected' | 'manual' | 'predicted' | 'lost'

export interface PlayerTrack {
  id: string
  box: BoundingBox
  center: Point2D
  keypoints: PoseKeypoint[]
  footPosition?: Point2D
  velocity: Vector2D
  confidence: TrackingConfidence
  selectedByUser: boolean
  state: TrackState
  lastSeenAt: number
  lostFrames: number
  approachAngleDeg?: number
}

export interface BallTrack {
  id: string
  center: Point2D
  radius: number
  trail: BallObservation[]
  velocity: Vector2D
  acceleration: Vector2D
  speedPxPerSec: number
  accelerationPxPerSec2: number
  confidence: TrackingConfidence
  state: TrackState
  source: DetectionSource
  lastSeenAt: number
  lostFrames: number
}

export interface GoalTargetZones {
  bottomLeft?: Point2D
  bottomRight?: Point2D
  topLeft?: Point2D
  topRight?: Point2D
  centre?: Point2D
}

export interface GoalCalibration {
  leftPostBase?: Point2D
  rightPostBase?: Point2D
  leftPostTop?: Point2D
  rightPostTop?: Point2D
  centre?: Point2D
  targetZones: GoalTargetZones
}

export interface KnownMeasurement {
  label: string
  metres: number
  imagePointA?: Point2D
  imagePointB?: Point2D
}

export interface CameraCalibration {
  fixedIpadMode: boolean
  frameWidth: number
  frameHeight: number
  lastStableAt?: string
  movementWarning?: string
}

export interface PitchCalibration {
  groundPlane: Point2D[]
  knownMeasurement?: KnownMeasurement
  metresPerPixel?: number
  homography?: number[]
}

export interface CalibrationProfile {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  goal: GoalCalibration
  pitch: PitchCalibration
  camera: CameraCalibration
  completeness: number
  confidence: TrackingConfidence
}

export interface GoalTrack {
  calibrated: boolean
  goal: GoalCalibration
  outline: Polygon
  mouth: Polygon
  centre?: Point2D
  confidence: TrackingConfidence
  source: 'manual-calibration' | 'auto-detected' | 'missing'
}

export type GoalAutoStatus = 'scanning' | 'suggesting' | 'locked'

export interface GoalAutoSuggestion {
  status: GoalAutoStatus
  goal: GoalCalibration
  box: BoundingBox
  confidence: TrackingConfidence
  stableFrames: number
  updatedAt: number
  applied: boolean
}

export type GoalOutcome = 'goal' | 'miss-left' | 'miss-right' | 'over' | 'saved-blocked-unclear' | 'unknown'

export type CurveDirection = 'left' | 'right' | 'none' | 'unclear'

export interface CurveEstimate {
  lateralDeviationPx: number
  score: number
  direction: CurveDirection
  confidence: TrackingConfidence
}

export interface AccuracyEstimate {
  score: number
  label: string
  target?: keyof GoalTargetZones | 'centre'
  distanceFromTargetPx?: number
  confidence: TrackingConfidence
}

export interface SpeedEstimate {
  pixelsPerSecond: number
  metresPerSecond?: number
  kmh?: number
  confidence: TrackingConfidence
}

export interface DistanceEstimate {
  pixels: number
  metres?: number
  confidence: TrackingConfidence
}

export interface PowerEstimate {
  score: number
  label: 'Low' | 'Medium' | 'High' | 'Rocket'
  confidence: TrackingConfidence
}

export interface ShotQualityScore {
  score: number
  label: string
  confidence: TrackingConfidence
  parts: {
    speed: number
    accuracy: number
    power: number
    distance: number
    curve: number
  }
}

export interface ShotMetrics {
  speed: SpeedEstimate
  power: PowerEstimate
  accuracy: AccuracyEstimate
  distance: DistanceEstimate
  curve: CurveEstimate
  quality: ShotQualityScore
}

export interface ShotEvent {
  id: string
  timestamp: string
  startedAt: number
  endedAt: number
  startPosition: Point2D
  endPosition: Point2D
  contactPoint?: Point2D
  playerPosition?: Point2D
  ballTrail: BallObservation[]
  outcome: GoalOutcome
  confidence: TrackingConfidence
  metrics: ShotMetrics
  raw: {
    durationMs: number
    peakSpeedPxPerSec: number
    averageSpeedPxPerSec: number
    frameCount: number
  }
  drillSessionId?: string
}

export interface VisionShotSummary {
  id: string
  timestamp: string
  outcome: GoalOutcome
  qualityScore: number
  powerScore: number
  accuracyScore: number
  curveScore: number
  speedKmh?: number
  speedPxPerSec: number
  peakSpeedPxPerSec: number
  averageSpeedPxPerSec: number
  powerLabel: string
  accuracyLabel: string
  curveDirection: CurveDirection
  confidenceScore: number
  distanceMetres?: number
  distancePixels: number
  drillSessionId?: string
}

export interface VisionRecordingSummary {
  id: string
  timestamp: string
  durationMs: number
  sizeBytes: number
  mimeType: string
  shotCount: number
}

export interface VisionRecordingRecord extends VisionRecordingSummary {
  video: Blob
}

export interface VisionFrame {
  index: number
  timestamp: number
  width: number
  height: number
}

export type PerformanceMode = 'high-accuracy' | 'balanced' | 'lightweight'

export interface ModelStatus {
  pose: 'idle' | 'loading' | 'ready' | 'failed' | 'disabled'
  object: 'idle' | 'loading' | 'ready' | 'failed' | 'disabled'
  backend?: string
  offlinePack?: 'unknown' | 'ready' | 'partial' | 'missing'
  error?: string
}

export type VisionAutoSetupStatus = 'idle' | 'scanning' | 'locking' | 'locked' | 'needs-manual' | 'blocked'

export interface VisionAutoSetupSignal {
  status: VisionAutoSetupStatus
  confidence: number
  message: string
}

export interface VisionAutoSetupState {
  player: VisionAutoSetupSignal
  ball: VisionAutoSetupSignal
  goal: VisionAutoSetupSignal
  ready: boolean
  messages: string[]
}

export interface VisionDebugInfo {
  fps: number
  frameSize: { width: number; height: number }
  modelStatus: ModelStatus
  detectionsPerFrame: number
  playerLostCount: number
  ballLostCount: number
  calibrationCompleteness: number
  shotDetectorState: 'idle' | 'armed' | 'candidate-shot' | 'tracking-shot' | 'cooldown'
  processingMode: PerformanceMode
  rawCoordinates: {
    player?: Point2D
    ball?: Point2D
    goal?: Polygon
  }
  confidence: {
    player: number
    ball: number
    goal: number
    shot: number
  }
  messages: string[]
}

export interface VisionEngineState {
  frame: VisionFrame
  detections: Detection[]
  player?: PlayerTrack
  ball?: BallTrack
  goal: GoalTrack
  goalSuggestion?: GoalAutoSuggestion
  autoSetup: VisionAutoSetupState
  activeShot?: ShotEvent
  lastShot?: ShotEvent
  debug: VisionDebugInfo
  warnings: string[]
}
