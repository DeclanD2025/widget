import { describe, expect, it } from 'vitest'
import { PlayerTracker } from '../playerTracker'
import { SessionAutoSetup } from '../sessionAutoSetup'
import type { Detection, VisionFrame } from '../types'

function frame(timestamp: number): VisionFrame {
  return { index: Math.round(timestamp / 100), timestamp, width: 640, height: 360 }
}

function person(id: string, x: number, y: number, timestamp: number, score = 0.74): Detection {
  const box = { x, y, width: 82, height: 176 }
  return {
    id,
    label: 'person',
    source: 'object-model',
    score,
    box,
    center: { x: x + box.width / 2, y: y + box.height / 2 },
    timestamp,
  }
}

describe('session auto setup', () => {
  it('does not let the player tracker cold-start from one unconfirmed person detection', () => {
    const tracker = new PlayerTracker()
    const detection = person('p1', 260, 96, 100)

    expect(tracker.update([detection], frame(100))).toBeUndefined()

    tracker.lockToDetection(detection)
    const track = tracker.update([person('p1-next', 264, 98, 220)], frame(220))

    expect(track?.state).toBe('detected')
    expect(track?.selectedByUser).toBe(false)
  })

  it('returns a player lock after one person remains stable', () => {
    const setup = new SessionAutoSetup()
    let result = setup.update({ detections: [], frame: frame(0) })

    for (let index = 0; index < 6; index += 1) {
      const timestamp = index * 120
      result = setup.update({
        detections: [person(`p-${index}`, 244 + index * 2, 94 + index, timestamp)],
        frame: frame(timestamp),
      })
    }

    expect(result.playerLock?.label).toBe('person')
    expect(result.state.player.status).toBe('locked')
    expect(result.state.player.confidence).toBeGreaterThan(0.7)
  })

  it('blocks auto-lock when two people are similarly likely', () => {
    const setup = new SessionAutoSetup()
    let result = setup.update({ detections: [], frame: frame(0) })

    for (let index = 0; index < 8; index += 1) {
      const timestamp = index * 120
      result = setup.update({
        detections: [person(`left-${index}`, 120, 94, timestamp), person(`right-${index}`, 390, 94, timestamp)],
        frame: frame(timestamp),
      })
    }

    expect(result.playerLock).toBeUndefined()
    expect(result.state.player.status).toBe('blocked')
  })

  it('does not auto-lock unstable person detections', () => {
    const setup = new SessionAutoSetup()
    let result = setup.update({ detections: [], frame: frame(0) })

    for (let index = 0; index < 8; index += 1) {
      const timestamp = index * 120
      const x = index % 2 === 0 ? 120 : 410
      result = setup.update({
        detections: [person(`jump-${index}`, x, 94, timestamp)],
        frame: frame(timestamp),
      })
    }

    expect(result.playerLock).toBeUndefined()
    expect(result.state.player.status).toBe('locking')
    expect(result.state.player.confidence).toBeLessThan(0.6)
  })
})
