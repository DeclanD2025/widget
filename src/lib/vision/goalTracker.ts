import { confidence } from './confidence'
import { buildGoalTrack } from './calibration'
import { distance, lineCrossesHorizontalBetween, midpoint, pointInPolygon } from './geometry'
import type { BallObservation, CalibrationProfile, GoalOutcome, GoalTargetZones, GoalTrack, Point2D, Polygon } from './types'

export function goalTrackFromProfile(profile?: CalibrationProfile): GoalTrack {
  if (!profile) {
    return {
      calibrated: false,
      goal: { targetZones: {} },
      outline: [],
      mouth: [],
      confidence: confidence(0, ['No goal calibration']),
      source: 'missing',
    }
  }
  const track = buildGoalTrack(profile.goal)
  return {
    ...track,
    confidence: profile.confidence,
  }
}

export function goalMouthPolygon(goal: GoalTrack): Polygon {
  if (goal.mouth.length >= 4) return goal.mouth
  const left = goal.goal.leftPostBase
  const right = goal.goal.rightPostBase
  if (!left || !right) return []
  const height = Math.max(80, distance(left, right) * 0.45)
  return [
    left,
    { x: left.x, y: left.y - height },
    { x: right.x, y: right.y - height },
    right,
  ]
}

export function goalCentre(goal: GoalTrack): Point2D | undefined {
  if (goal.centre) return goal.centre
  const left = goal.goal.leftPostBase
  const right = goal.goal.rightPostBase
  if (!left || !right) return undefined
  return midpoint(left, right)
}

export function classifyGoalOutcome(trail: BallObservation[], goal: GoalTrack): { outcome: GoalOutcome; crossing?: Point2D } {
  if (!goal.calibrated || trail.length < 2) return { outcome: 'unknown' }
  const mouth = goalMouthPolygon(goal)
  const left = goal.goal.leftPostBase
  const right = goal.goal.rightPostBase
  if (!left || !right || mouth.length < 4) return { outcome: 'unknown' }

  const latest = trail[trail.length - 1]
  const previous = trail[trail.length - 2]
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1]
    const b = trail[i]
    if (pointInPolygon(b, mouth)) return { outcome: 'goal', crossing: b }
    const baseY = (left.y + right.y) / 2
    const crossing = lineCrossesHorizontalBetween(a, b, baseY)
    if (crossing && crossing.x >= Math.min(left.x, right.x) && crossing.x <= Math.max(left.x, right.x)) {
      return { outcome: 'goal', crossing }
    }
  }

  const goalWidth = distance(left, right)
  const minX = Math.min(left.x, right.x)
  const maxX = Math.max(left.x, right.x)
  const topY = Math.min(...mouth.map((p) => p.y))
  const bottomY = Math.max(...mouth.map((p) => p.y))

  if (latest.x < minX - goalWidth * 0.12) return { outcome: 'miss-left' }
  if (latest.x > maxX + goalWidth * 0.12) return { outcome: 'miss-right' }
  if (latest.y < topY - goalWidth * 0.12) return { outcome: 'over' }
  if (latest.y >= topY && latest.y <= bottomY && latest.x >= minX && latest.x <= maxX) {
    return { outcome: previous.confidence < 0.25 ? 'unknown' : 'saved-blocked-unclear' }
  }
  return { outcome: 'unknown' }
}

export function nearestTargetZone(point: Point2D, zones: GoalTargetZones): { key?: keyof GoalTargetZones | 'centre'; distancePx?: number } {
  const entries = Object.entries(zones).filter((entry): entry is [keyof GoalTargetZones, Point2D] => Boolean(entry[1]))
  if (entries.length === 0) return {}
  return entries
    .map(([key, target]) => ({ key, distancePx: distance(point, target) }))
    .sort((a, b) => a.distancePx - b.distancePx)[0]
}
