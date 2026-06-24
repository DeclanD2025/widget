import { describe, expect, it } from 'vitest'
import { detectGoalCandidateFromImageData } from '../goalAutoDetector'

function image(width = 240, height = 135): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 34
    data[index + 1] = 92
    data[index + 2] = 42
    data[index + 3] = 255
  }
  return { width, height, data } as ImageData
}

function drawRect(data: Uint8ClampedArray, width: number, x: number, y: number, w: number, h: number, colour: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      const index = (yy * width + xx) * 4
      data[index] = colour[0]
      data[index + 1] = colour[1]
      data[index + 2] = colour[2]
      data[index + 3] = 255
    }
  }
}

describe('goal auto detector', () => {
  it('detects a bright rectangular garden goal frame', () => {
    const frame = image()
    drawRect(frame.data, frame.width, 68, 36, 4, 68, [242, 245, 238])
    drawRect(frame.data, frame.width, 168, 36, 4, 68, [242, 245, 238])
    drawRect(frame.data, frame.width, 68, 36, 104, 4, [242, 245, 238])

    const suggestion = detectGoalCandidateFromImageData(frame, { width: 480, height: 270, timestamp: 1000 })

    expect(suggestion).toBeDefined()
    expect(suggestion?.confidence.score).toBeGreaterThan(0.58)
    expect(suggestion?.goal.leftPostBase?.x).toBeCloseTo(140, -1)
    expect(suggestion?.goal.rightPostBase?.x).toBeCloseTo(340, -1)
    expect(suggestion?.goal.leftPostTop?.y).toBeCloseTo(72, -1)
  })

  it('rejects disconnected bright noise as a goal', () => {
    const frame = image()
    drawRect(frame.data, frame.width, 20, 20, 8, 8, [250, 250, 250])
    drawRect(frame.data, frame.width, 150, 50, 10, 10, [245, 245, 245])
    drawRect(frame.data, frame.width, 90, 100, 14, 5, [252, 252, 252])

    const suggestion = detectGoalCandidateFromImageData(frame, { width: 480, height: 270, timestamp: 1000 })

    expect(suggestion).toBeUndefined()
  })
})
