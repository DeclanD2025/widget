import type { ConfidenceBand, TrackingConfidence } from './types'

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function bandForScore(score: number): ConfidenceBand {
  const clamped = clamp01(score)
  if (clamped >= 0.78) return 'high'
  if (clamped >= 0.52) return 'medium'
  if (clamped >= 0.25) return 'low'
  return 'very-low'
}

export function confidence(score: number, reasons: string[] = []): TrackingConfidence {
  const clamped = clamp01(score)
  return {
    score: clamped,
    band: bandForScore(clamped),
    reasons,
  }
}

export function combineConfidence(parts: Array<{ score: number; weight?: number; reason?: string }>): TrackingConfidence {
  const weighted = parts.filter((part) => part.weight !== 0)
  if (weighted.length === 0) return confidence(0, ['No confidence signals'])

  let totalWeight = 0
  let total = 0
  const reasons: string[] = []
  for (const part of weighted) {
    const weight = part.weight ?? 1
    totalWeight += weight
    total += clamp01(part.score) * weight
    if (part.reason) reasons.push(part.reason)
  }

  return confidence(totalWeight > 0 ? total / totalWeight : 0, reasons)
}

export function confidenceText(prefix: string, value: string | number, level: TrackingConfidence): string {
  if (level.band === 'high') return `${prefix}: ${value}`
  if (level.band === 'medium') return `${prefix}: around ${value}`
  if (level.band === 'low') return `Rough ${prefix.toLowerCase()}: ${value}`
  return `Camera uncertain - ${prefix.toLowerCase()}: ${value}`
}

export function confidenceClass(level: TrackingConfidence): string {
  switch (level.band) {
    case 'high':
      return 'text-emerald-glow'
    case 'medium':
      return 'text-gold'
    case 'low':
      return 'text-orange-300'
    case 'very-low':
      return 'text-red-300'
  }
}
