import { confidenceText } from './confidence'
import type { ShotEvent } from './types'

export interface ShotFeedback {
  title: string
  subtitle: string
  details: string[]
  coaching: string
}

export function buildShotFeedback(shot?: ShotEvent): ShotFeedback | undefined {
  if (!shot) return undefined
  const score = shot.metrics.quality.score
  const titlePrefix = shot.outcome === 'goal' ? 'GOAL!' : shot.outcome === 'unknown' ? 'SHOT DETECTED' : 'SHOT'
  const title = `${titlePrefix} ${score}/100`
  const curve =
    shot.metrics.curve.direction === 'none'
      ? 'little curve'
      : shot.metrics.curve.direction === 'unclear'
        ? 'unclear curve'
        : `${shot.metrics.curve.direction} bend`
  const speed = shot.metrics.speed.kmh ? `${shot.metrics.speed.kmh} km/h` : `${shot.metrics.speed.pixelsPerSecond} px/s`
  const subtitle =
    shot.outcome === 'goal'
      ? `Fast shot, ${shot.metrics.accuracy.label.toLowerCase()}, ${curve}.`
      : shot.outcome === 'over'
        ? `Great power, but try aiming lower.`
        : shot.outcome === 'miss-left' || shot.outcome === 'miss-right'
          ? `Nice strike - adjust the aim next one.`
          : shot.confidence.band === 'very-low'
            ? `The camera lost the ball, so this one is uncertain.`
            : `Shot tracked with ${shot.confidence.band} confidence.`

  const details = [
    confidenceText('Estimated speed', speed, shot.metrics.speed.confidence),
    `Accuracy: ${shot.metrics.accuracy.label}`,
    `Power estimate: ${shot.metrics.power.label}`,
    `Curve: ${shot.metrics.curve.direction}`,
    `Confidence: ${shot.confidence.band}`,
  ]

  const coaching =
    shot.outcome === 'goal' && shot.metrics.accuracy.score > 78
      ? 'Brilliant placement. Try hitting the same zone twice in a row.'
      : shot.metrics.power.score > 72 && shot.metrics.accuracy.score < 50
        ? 'Great power, but set the standing foot and aim through the target.'
        : shot.metrics.curve.score > 35
          ? 'Nice curve - it bent away from the centre.'
          : shot.confidence.band === 'low' || shot.confidence.band === 'very-low'
            ? 'Try placing the iPad further back so the ball stays in view.'
            : 'Good hit. Pick a corner before the next shot.'

  return { title, subtitle, details, coaching }
}
