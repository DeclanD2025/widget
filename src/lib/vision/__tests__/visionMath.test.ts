import { describe, expect, it } from 'vitest'
import { distance, maxLateralDeviation, pointInPolygon } from '../geometry'
import { buildGoalTrack } from '../calibration'
import { classifyGoalOutcome } from '../goalTracker'
import { buildShotMetrics, estimateCurve, estimateSpeed } from '../shotMetrics'
import type { BallObservation, CalibrationProfile, GoalCalibration } from '../types'

function obs(x: number, y: number, timestamp: number, confidence = 0.9): BallObservation {
  return { x, y, timestamp, confidence, radius: 8, source: 'motion' }
}

function calibratedGoal(): GoalCalibration {
  return {
    leftPostBase: { x: 100, y: 220 },
    rightPostBase: { x: 300, y: 220 },
    leftPostTop: { x: 100, y: 80 },
    rightPostTop: { x: 300, y: 80 },
    centre: { x: 200, y: 150 },
    targetZones: {
      bottomLeft: { x: 130, y: 198 },
      bottomRight: { x: 270, y: 198 },
      topLeft: { x: 130, y: 105 },
      topRight: { x: 270, y: 105 },
      centre: { x: 200, y: 150 },
    },
  }
}

function profile(): CalibrationProfile {
  return {
    id: 'test-profile',
    name: 'Test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    goal: calibratedGoal(),
    pitch: {
      groundPlane: [],
      metresPerPixel: 0.05,
    },
    camera: {
      fixedIpadMode: true,
      frameWidth: 400,
      frameHeight: 300,
    },
    completeness: 80,
    confidence: { score: 0.8, band: 'high', reasons: ['test'] },
  }
}

describe('vision geometry', () => {
  it('calculates distance and polygon inclusion', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    expect(pointInPolygon({ x: 10, y: 10 }, [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ])).toBe(true)
  })

  it('measures lateral curve away from a straight line', () => {
    const curve = maxLateralDeviation([
      { x: 0, y: 0 },
      { x: 50, y: 20 },
      { x: 100, y: 0 },
    ])
    expect(curve.deviation).toBe(20)
    expect(curve.signed).toBeGreaterThan(0)
  })
})

describe('vision shot metrics', () => {
  it('converts pixel speed to metres per second and km/h when calibrated', () => {
    const speed = estimateSpeed([obs(0, 0, 0), obs(100, 0, 1000)], 0.1)
    expect(speed.pixelsPerSecond).toBe(100)
    expect(speed.metresPerSecond).toBeCloseTo(10)
    expect(speed.kmh).toBe(36)
  })

  it('estimates curve direction and score from the ball trail', () => {
    const curve = estimateCurve([obs(0, 0, 0), obs(50, 22, 120), obs(100, 0, 240)])
    expect(curve.direction).toBe('right')
    expect(curve.score).toBeGreaterThan(20)
  })

  it('classifies a tracked ball entering the calibrated goal', () => {
    const goal = buildGoalTrack(calibratedGoal())
    const result = classifyGoalOutcome([obs(200, 250, 0), obs(205, 180, 220), obs(210, 130, 420)], goal)
    expect(result.outcome).toBe('goal')
  })

  it('scores accurate goals higher than wild misses', () => {
    const goal = buildGoalTrack(calibratedGoal())
    const goodTrail = [obs(210, 260, 0), obs(205, 210, 130), obs(202, 165, 260), obs(200, 145, 390)]
    const missTrail = [obs(90, 260, 0), obs(72, 220, 130), obs(52, 190, 260), obs(30, 170, 390)]
    const good = buildShotMetrics(goodTrail, goal, profile())
    const miss = buildShotMetrics(missTrail, goal, profile())

    expect(good.outcome).toBe('goal')
    expect(miss.outcome).toBe('miss-left')
    expect(good.metrics.quality.score).toBeGreaterThan(miss.metrics.quality.score)
    expect(good.metrics.accuracy.score).toBeGreaterThan(miss.metrics.accuracy.score)
  })
})
