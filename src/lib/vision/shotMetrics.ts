import { clamp01, combineConfidence, confidence } from './confidence'
import { classifyGoalOutcome, goalCentre, nearestTargetZone } from './goalTracker'
import { distance, maxLateralDeviation } from './geometry'
import type {
  AccuracyEstimate,
  BallObservation,
  CalibrationProfile,
  CurveEstimate,
  DistanceEstimate,
  GoalOutcome,
  GoalTrack,
  PowerEstimate,
  ShotMetrics,
  ShotQualityScore,
  SpeedEstimate,
} from './types'

function trailPoints(trail: BallObservation[]) {
  return trail.map((p) => ({ x: p.x, y: p.y }))
}

function last<T>(items: T[]): T {
  return items[items.length - 1]
}

export function estimateSpeed(trail: BallObservation[], metresPerPixel?: number): SpeedEstimate {
  if (trail.length < 2) return { pixelsPerSecond: 0, confidence: confidence(0, ['Not enough ball trail']) }
  const segmentSpeeds: number[] = []

  for (let i = 1; i < trail.length; i++) {
    const dt = Math.max(16, trail[i].timestamp - trail[i - 1].timestamp) / 1000
    const speed = distance(trail[i - 1], trail[i]) / dt
    segmentSpeeds.push(speed)
  }

  const robustSpeed = robustShotSpeed(segmentSpeeds)
  const averageConfidence = trail.reduce((sum, p) => sum + p.confidence, 0) / trail.length
  const durationMs = last(trail).timestamp - trail[0].timestamp
  const speedConfidence = combineConfidence([
    { score: averageConfidence, weight: 0.46, reason: 'Ball tracking confidence' },
    { score: clamp01(trail.length / 10), weight: 0.24, reason: 'Trail sample count' },
    { score: clamp01(durationMs / 450), weight: 0.16, reason: 'Shot duration' },
    { score: metresPerPixel ? 0.86 : 0.38, weight: 0.14, reason: metresPerPixel ? 'Calibrated metres available' : 'Pixel speed only' },
  ])
  const pixelsPerSecond = Math.round(robustSpeed)
  const metresPerSecond = metresPerPixel ? robustSpeed * metresPerPixel : undefined
  return {
    pixelsPerSecond,
    metresPerSecond,
    kmh: metresPerSecond ? Math.round(metresPerSecond * 3.6) : undefined,
    confidence: speedConfidence,
  }
}

function robustShotSpeed(speeds: number[]): number {
  if (speeds.length === 0) return 0
  const sorted = [...speeds].sort((a, b) => a - b)
  const p75 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))]
  const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))]
  const average = sorted.reduce((sum, speed) => sum + speed, 0) / sorted.length
  return Math.min(p90, Math.max(p75, average * 1.18))
}

export function estimateDistance(trail: BallObservation[], profile?: CalibrationProfile): DistanceEstimate {
  if (trail.length < 2) return { pixels: 0, confidence: confidence(0, ['Not enough ball trail']) }
  const pixels = distance(trail[0], last(trail))
  const metres = profile?.pitch.metresPerPixel ? pixels * profile.pitch.metresPerPixel : undefined
  return {
    pixels: Math.round(pixels),
    metres: metres ? Number(metres.toFixed(1)) : undefined,
    confidence: combineConfidence([
      { score: trail.length / 8, weight: 0.28, reason: 'Trail sample count' },
      { score: profile?.pitch.metresPerPixel ? 0.82 : 0.28, weight: 0.46, reason: profile?.pitch.metresPerPixel ? 'Known measurement calibrated' : 'No real-world scale' },
      { score: trail.reduce((sum, p) => sum + p.confidence, 0) / trail.length, weight: 0.26, reason: 'Ball confidence' },
    ]),
  }
}

export function estimateCurve(trail: BallObservation[]): CurveEstimate {
  const points = trailPoints(trail)
  const { deviation, signed } = maxLateralDeviation(points)
  const shotLength = points.length >= 2 ? distance(points[0], last(points)) : 0
  const ratio = shotLength > 0 ? deviation / shotLength : 0
  const score = Math.round(clamp01(ratio * 3.2) * 100)
  const direction = score < 8 ? 'none' : signed > 0 ? 'right' : signed < 0 ? 'left' : 'unclear'
  return {
    lateralDeviationPx: Math.round(deviation),
    score,
    direction,
    confidence: combineConfidence([
      { score: clamp01(points.length / 12), weight: 0.35, reason: 'Curve trail sample count' },
      { score: shotLength > 80 ? 0.75 : 0.28, weight: 0.25, reason: shotLength > 80 ? 'Long enough path' : 'Short path' },
      { score: trail.reduce((sum, p) => sum + p.confidence, 0) / Math.max(1, trail.length), weight: 0.4, reason: 'Ball confidence' },
    ]),
  }
}

export function estimateAccuracy(trail: BallObservation[], goal: GoalTrack, outcome: GoalOutcome): AccuracyEstimate {
  if (trail.length === 0) return { score: 0, label: 'Unknown', confidence: confidence(0, ['No ball trail']) }
  const end = last(trail)
  if (!goal.calibrated) {
    return {
      score: outcome === 'goal' ? 62 : 35,
      label: outcome === 'goal' ? 'On target' : 'Needs goal calibration',
      confidence: confidence(0.18, ['Goal not calibrated']),
    }
  }

  const centre = goalCentre(goal)
  const target = nearestTargetZone(end, goal.goal.targetZones)
  const reference = target.distancePx !== undefined ? target.distancePx : centre ? distance(end, centre) : undefined
  const goalWidth = goal.goal.leftPostBase && goal.goal.rightPostBase ? distance(goal.goal.leftPostBase, goal.goal.rightPostBase) : 220
  const distancePenalty = reference === undefined ? 0.35 : clamp01(reference / Math.max(1, goalWidth * 0.58))
  const base = outcome === 'goal' ? 92 : outcome === 'saved-blocked-unclear' ? 72 : outcome === 'unknown' ? 45 : 35
  const score = Math.round(clamp01(base / 100 - distancePenalty * 0.42) * 100)

  const label =
    outcome === 'goal'
      ? target.key
        ? zoneLabel(target.key)
        : 'In the goal'
      : outcome === 'miss-left'
        ? 'Missed left'
        : outcome === 'miss-right'
          ? 'Missed right'
          : outcome === 'over'
            ? 'Over the bar'
            : outcome === 'saved-blocked-unclear'
              ? 'On target or blocked'
              : 'Unknown'

  return {
    score,
    label,
    target: target.key,
    distanceFromTargetPx: reference === undefined ? undefined : Math.round(reference),
    confidence: combineConfidence([
      { score: goal.confidence.score, weight: 0.45, reason: 'Goal calibration confidence' },
      { score: last(trail).confidence, weight: 0.28, reason: 'End point confidence' },
      { score: target.key || centre ? 0.82 : 0.4, weight: 0.27, reason: target.key ? 'Target zone marked' : 'Goal centre estimate' },
    ]),
  }
}

export function estimatePower(speed: SpeedEstimate, distanceEstimate: DistanceEstimate, durationMs: number): PowerEstimate {
  const speedComponent = speed.kmh ? clamp01((speed.kmh - 12) / 46) : clamp01((speed.pixelsPerSecond - 260) / 1450)
  const distanceComponent = distanceEstimate.metres ? clamp01(distanceEstimate.metres / 18) : clamp01(distanceEstimate.pixels / 760)
  const urgency = clamp01(1 - durationMs / 2600)
  const calibrationPenalty = speed.kmh ? 1 : 0.72
  const score = Math.round((speedComponent * 0.72 + distanceComponent * 0.18 + urgency * 0.1) * 100 * calibrationPenalty)
  return {
    score,
    label: score >= 88 ? 'Rocket' : score >= 70 ? 'High' : score >= 42 ? 'Medium' : 'Low',
    confidence: combineConfidence([
      { score: speed.confidence.score, weight: 0.55, reason: 'Speed confidence' },
      { score: distanceEstimate.confidence.score, weight: 0.25, reason: 'Distance confidence' },
      { score: durationMs > 80 ? 0.72 : 0.25, weight: 0.2, reason: 'Shot duration sample' },
    ]),
  }
}

export function scoreShotQuality(metrics: Omit<ShotMetrics, 'quality'>, outcome: GoalOutcome): ShotQualityScore {
  const outcomeBoost = outcome === 'goal' ? 12 : outcome === 'saved-blocked-unclear' ? 4 : outcome === 'unknown' ? -8 : -14
  const raw =
    metrics.speed.confidence.score * metrics.speed.pixelsPerSecond * 0.012 +
    metrics.accuracy.score * 0.42 +
    metrics.power.score * 0.2 +
    Math.min(metrics.distance.metres ?? metrics.distance.pixels / 45, 18) * 0.75 +
    metrics.curve.score * 0.08 +
    outcomeBoost
  const confidencePenalty = (1 - averageConfidence(metrics)) * 18
  const score = Math.round(clamp01((raw - confidencePenalty) / 100) * 100)
  return {
    score,
    label: score >= 86 ? 'Worldie' : score >= 72 ? 'Brilliant finish' : score >= 56 ? 'Good shot' : score >= 38 ? 'Keep aiming' : 'Camera unsure',
    confidence: combineConfidence([
      { score: metrics.speed.confidence.score, weight: 0.25, reason: 'Speed confidence' },
      { score: metrics.accuracy.confidence.score, weight: 0.3, reason: 'Accuracy confidence' },
      { score: metrics.power.confidence.score, weight: 0.18, reason: 'Power confidence' },
      { score: metrics.distance.confidence.score, weight: 0.14, reason: 'Distance confidence' },
      { score: metrics.curve.confidence.score, weight: 0.13, reason: 'Curve confidence' },
    ]),
    parts: {
      speed: Math.round(clamp01(metrics.speed.pixelsPerSecond / 1300) * 100),
      accuracy: metrics.accuracy.score,
      power: metrics.power.score,
      distance: Math.round(clamp01((metrics.distance.metres ?? metrics.distance.pixels / 45) / 18) * 100),
      curve: metrics.curve.score,
    },
  }
}

export function buildShotMetrics(trail: BallObservation[], goal: GoalTrack, profile?: CalibrationProfile): { metrics: ShotMetrics; outcome: GoalOutcome } {
  const { outcome } = classifyGoalOutcome(trail, goal)
  const speed = estimateSpeed(trail, profile?.pitch.metresPerPixel)
  const distanceEstimate = estimateDistance(trail, profile)
  const curve = estimateCurve(trail)
  const accuracy = estimateAccuracy(trail, goal, outcome)
  const durationMs = trail.length >= 2 ? last(trail).timestamp - trail[0].timestamp : 0
  const power = estimatePower(speed, distanceEstimate, durationMs)
  const partial = { speed, distance: distanceEstimate, curve, accuracy, power }
  return {
    outcome,
    metrics: {
      ...partial,
      quality: scoreShotQuality(partial, outcome),
    },
  }
}

function averageConfidence(metrics: Omit<ShotMetrics, 'quality'>): number {
  return (
    metrics.speed.confidence.score +
    metrics.accuracy.confidence.score +
    metrics.power.confidence.score +
    metrics.distance.confidence.score +
    metrics.curve.confidence.score
  ) / 5
}

function zoneLabel(zone: keyof GoalTrack['goal']['targetZones'] | 'centre'): string {
  switch (zone) {
    case 'bottomLeft':
      return 'Bottom left zone'
    case 'bottomRight':
      return 'Bottom right zone'
    case 'topLeft':
      return 'Top left zone'
    case 'topRight':
      return 'Top right zone'
    case 'centre':
      return 'Centre target'
  }
}
