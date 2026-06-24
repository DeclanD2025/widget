import { describe, expect, it } from 'vitest'
import { distance, maxLateralDeviation, pointInPolygon } from '../geometry'
import { buildGoalTrack } from '../calibration'
import { classifyGoalOutcome } from '../goalTracker'
import { buildShotMetrics, estimateCurve, estimatePower, estimateSpeed } from '../shotMetrics'
import { ShotDetector } from '../shotDetector'
import type { BallObservation, BallTrack, CalibrationProfile, GoalCalibration, PlayerTrack, VisionFrame } from '../types'

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

function playerAtFoot(x: number, y: number): PlayerTrack {
  return {
    id: 'active-player',
    box: { x: x - 40, y: y - 170, width: 80, height: 180 },
    center: { x, y: y - 90 },
    keypoints: [],
    footPosition: { x, y },
    velocity: { x: 0, y: 0 },
    confidence: { score: 0.82, band: 'high', reasons: ['test'] },
    selectedByUser: true,
    state: 'detected',
    lastSeenAt: 0,
    lostFrames: 0,
  }
}

function ballTrack(trail: BallObservation[], speedPxPerSec: number, accelerationPxPerSec2 = 0): BallTrack {
  const centre = trail[trail.length - 1]
  return {
    id: 'active-ball',
    center: centre,
    radius: 9,
    trail,
    velocity: { x: speedPxPerSec, y: 0 },
    acceleration: { x: accelerationPxPerSec2, y: 0 },
    speedPxPerSec,
    accelerationPxPerSec2,
    confidence: { score: 0.82, band: 'high', reasons: ['test'] },
    state: 'detected',
    source: 'motion',
    lastSeenAt: centre.timestamp,
    lostFrames: 0,
  }
}

function frame(timestamp: number): VisionFrame {
  return { index: Math.round(timestamp), timestamp, width: 400, height: 300 }
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

  it('keeps pixel-only power estimates conservative', () => {
    const power = estimatePower(
      { pixelsPerSecond: 700, confidence: { score: 0.5, band: 'low', reasons: ['pixel only'] } },
      { pixels: 260, confidence: { score: 0.28, band: 'low', reasons: ['uncalibrated'] } },
      1000,
    )
    expect(power.score).toBeLessThan(45)
    expect(power.label).toBe('Low')
  })
})

describe('vision shot detector', () => {
  it('does not classify dribbling near the foot as a shot', () => {
    const detector = new ShotDetector()
    const player = playerAtFoot(100, 220)
    const goal = buildGoalTrack(calibratedGoal())
    const dribble = ballTrack([obs(103, 220, 0), obs(112, 218, 60), obs(119, 221, 120), obs(126, 219, 180), obs(132, 221, 240)], 620, 2600)

    const shot = detector.update({ ball: dribble, player, goal, profile: profile(), frame: frame(240) })

    expect(shot).toBeUndefined()
    expect(detector.state).not.toBe('tracking-shot')
  })

  it('requires a fast ball to separate from the player before tracking a shot', () => {
    const detector = new ShotDetector()
    const player = playerAtFoot(100, 220)
    const goal = buildGoalTrack({
      ...calibratedGoal(),
      leftPostBase: { x: 300, y: 220 },
      rightPostBase: { x: 390, y: 220 },
      leftPostTop: { x: 300, y: 120 },
      rightPostTop: { x: 390, y: 120 },
      centre: { x: 345, y: 170 },
    })
    const candidate = ballTrack([obs(102, 220, 0), obs(128, 213, 50), obs(165, 205, 100), obs(205, 196, 150), obs(248, 188, 190)], 820, 3000)
    const separated = ballTrack([...candidate.trail, obs(330, 175, 360)], 760, 1000)

    detector.update({ ball: candidate, player, goal, profile: profile(), frame: frame(190) })
    detector.update({ ball: separated, player, goal, profile: profile(), frame: frame(360) })

    expect(detector.state).toBe('tracking-shot')
  })
})
