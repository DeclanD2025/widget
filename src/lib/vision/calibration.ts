import { confidence } from './confidence'
import { buildGroundHomography } from './homography'
import { distance, midpoint } from './geometry'
import type {
  CalibrationProfile,
  CameraCalibration,
  GoalCalibration,
  GoalTrack,
  KnownMeasurement,
  PitchCalibration,
  Point2D,
  TrackingConfidence,
} from './types'

export const GOAL_POINT_LABELS = [
  'leftPostBase',
  'rightPostBase',
  'leftPostTop',
  'rightPostTop',
  'centre',
] as const

export type GoalPointKey = (typeof GOAL_POINT_LABELS)[number]

export const GROUND_POINT_COUNT = 4

export function createEmptyGoalCalibration(): GoalCalibration {
  return { targetZones: {} }
}

export function createEmptyPitchCalibration(): PitchCalibration {
  return { groundPlane: [] }
}

export function createCameraCalibration(width = 0, height = 0): CameraCalibration {
  return {
    fixedIpadMode: true,
    frameWidth: width,
    frameHeight: height,
  }
}

export function estimateMetresPerPixel(measurement?: KnownMeasurement): number | undefined {
  if (!measurement?.imagePointA || !measurement.imagePointB || measurement.metres <= 0) return undefined
  const px = distance(measurement.imagePointA, measurement.imagePointB)
  if (px <= 0) return undefined
  return measurement.metres / px
}

export function calibrationCompleteness(goal: GoalCalibration, pitch: PitchCalibration): number {
  const goalPoints = [
    goal.leftPostBase,
    goal.rightPostBase,
    goal.leftPostTop,
    goal.rightPostTop,
    goal.centre,
  ].filter(Boolean).length
  const targetZones = Object.values(goal.targetZones).filter(Boolean).length
  const ground = Math.min(pitch.groundPlane.length, GROUND_POINT_COUNT)
  const known = estimateMetresPerPixel(pitch.knownMeasurement) ? 1 : 0

  return Math.round(((goalPoints / 5) * 0.4 + (targetZones / 5) * 0.15 + (ground / 4) * 0.3 + known * 0.15) * 100)
}

export function calibrationConfidence(goal: GoalCalibration, pitch: PitchCalibration): TrackingConfidence {
  const completeness = calibrationCompleteness(goal, pitch)
  const hasGoalWidth = Boolean(goal.leftPostBase && goal.rightPostBase)
  const hasGoalTop = Boolean(goal.leftPostTop && goal.rightPostTop)
  const hasGround = pitch.groundPlane.length === GROUND_POINT_COUNT
  const hasScale = Boolean(estimateMetresPerPixel(pitch.knownMeasurement))
  const reasons = [
    hasGoalWidth ? 'Goal width marked' : 'Goal width missing',
    hasGoalTop ? 'Goal height marked' : 'Goal top optional/missing',
    hasGround ? 'Ground plane marked' : 'Ground plane incomplete',
    hasScale ? 'Known distance set' : 'No real-world scale',
  ]
  return confidence(completeness / 100, reasons)
}

export function buildPitchCalibration(groundPlane: Point2D[], knownMeasurement?: KnownMeasurement): PitchCalibration {
  return {
    groundPlane,
    knownMeasurement,
    metresPerPixel: estimateMetresPerPixel(knownMeasurement),
    homography: groundPlane.length === GROUND_POINT_COUNT ? buildGroundHomography(groundPlane) : undefined,
  }
}

export function buildCalibrationProfile(input: {
  id?: string
  name: string
  goal: GoalCalibration
  pitch: PitchCalibration
  camera: CameraCalibration
  createdAt?: string
}): CalibrationProfile {
  const now = new Date().toISOString()
  const pitch = buildPitchCalibration(input.pitch.groundPlane, input.pitch.knownMeasurement)
  const completeness = calibrationCompleteness(input.goal, pitch)
  return {
    id: input.id ?? `calibration-${Date.now()}`,
    name: input.name.trim() || 'Garden goal',
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    goal: input.goal,
    pitch,
    camera: input.camera,
    completeness,
    confidence: calibrationConfidence(input.goal, pitch),
  }
}

export function buildGoalTrack(goal: GoalCalibration): GoalTrack {
  const baseLeft = goal.leftPostBase
  const baseRight = goal.rightPostBase
  const topLeft = goal.leftPostTop
  const topRight = goal.rightPostTop
  const centre = goal.centre ?? (baseLeft && baseRight ? midpoint(baseLeft, baseRight) : undefined)
  const outline = [baseLeft, topLeft, topRight, baseRight].filter(Boolean) as Point2D[]
  const mouth = [baseLeft, topLeft, topRight, baseRight].filter(Boolean) as Point2D[]
  const calibrated = Boolean(baseLeft && baseRight && centre)
  return {
    calibrated,
    goal,
    outline,
    mouth,
    centre,
    confidence: calibrationConfidence(goal, { groundPlane: [], metresPerPixel: undefined }),
    source: calibrated ? 'manual-calibration' : 'missing',
  }
}

export function addGoalPoint(goal: GoalCalibration, key: GoalPointKey, point: Point2D): GoalCalibration {
  return { ...goal, [key]: point }
}

export function addTargetPoint(goal: GoalCalibration, key: keyof GoalCalibration['targetZones'], point: Point2D): GoalCalibration {
  return {
    ...goal,
    targetZones: {
      ...goal.targetZones,
      [key]: point,
    },
  }
}
