import { confidence } from './confidence'
import { boxCenter, distance } from './geometry'
import type { BoundingBox, GoalAutoSuggestion, GoalCalibration, Point2D, TrackingConfidence, VisionFrame } from './types'

const SCAN_W = 240
const SCAN_H = 135
const SCAN_EVERY_FRAMES = 4
const STABLE_GOAL_FRAMES = 5
const CANDIDATE_MEMORY_MS = 900

interface ImageLike {
  width: number
  height: number
  data: Uint8ClampedArray
}

interface GoalCandidate {
  box: BoundingBox
  goal: GoalCalibration
  confidence: TrackingConfidence
  updatedAt: number
}

interface StableGoalCandidate extends GoalCandidate {
  stableFrames: number
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function smoothNumber(previous: number, next: number, alpha: number): number {
  return previous + (next - previous) * alpha
}

function smoothBox(previous: BoundingBox, next: BoundingBox, alpha: number): BoundingBox {
  return {
    x: smoothNumber(previous.x, next.x, alpha),
    y: smoothNumber(previous.y, next.y, alpha),
    width: smoothNumber(previous.width, next.width, alpha),
    height: smoothNumber(previous.height, next.height, alpha),
  }
}

function goalFromBox(box: BoundingBox): GoalCalibration {
  const left = box.x
  const right = box.x + box.width
  const top = box.y
  const bottom = box.y + box.height
  return {
    leftPostBase: { x: left, y: bottom },
    rightPostBase: { x: right, y: bottom },
    leftPostTop: { x: left, y: top },
    rightPostTop: { x: right, y: top },
    centre: { x: left + box.width / 2, y: top + box.height / 2 },
    targetZones: {
      bottomLeft: { x: left + box.width * 0.2, y: bottom - box.height * 0.18 },
      bottomRight: { x: right - box.width * 0.2, y: bottom - box.height * 0.18 },
      topLeft: { x: left + box.width * 0.2, y: top + box.height * 0.2 },
      topRight: { x: right - box.width * 0.2, y: top + box.height * 0.2 },
      centre: { x: left + box.width / 2, y: top + box.height / 2 },
    },
  }
}

function scaleBox(box: BoundingBox, from: { width: number; height: number }, to: { width: number; height: number }): BoundingBox {
  const sx = to.width / Math.max(1, from.width)
  const sy = to.height / Math.max(1, from.height)
  return {
    x: box.x * sx,
    y: box.y * sy,
    width: box.width * sx,
    height: box.height * sy,
  }
}

function isGoalPixel(data: Uint8ClampedArray, index: number): boolean {
  const r = data[index]
  const g = data[index + 1]
  const b = data[index + 2]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const luma = r * 0.299 + g * 0.587 + b * 0.114
  const saturation = max - min
  const whiteFrame = luma >= 142 && max >= 155 && saturation <= 82
  const paleFrame = luma >= 168 && saturation <= 112
  return whiteFrame || paleFrame
}

function smoothHistogram(values: number[], radius: number): number[] {
  return values.map((_, index) => {
    let total = 0
    let count = 0
    for (let offset = -radius; offset <= radius; offset += 1) {
      const nextIndex = index + offset
      if (nextIndex < 0 || nextIndex >= values.length) continue
      total += values[nextIndex]
      count += 1
    }
    return total / Math.max(1, count)
  })
}

function findPeaks(histogram: number[], threshold: number, minSpacing: number, limit: number): number[] {
  const peaks = histogram
    .map((value, index) => ({ value, index }))
    .filter(({ value, index }) => value >= threshold && value >= (histogram[index - 1] ?? 0) && value >= (histogram[index + 1] ?? 0))
    .sort((a, b) => b.value - a.value)

  const chosen: number[] = []
  for (const peak of peaks) {
    if (chosen.every((index) => Math.abs(index - peak.index) >= minSpacing)) chosen.push(peak.index)
    if (chosen.length >= limit) break
  }
  return chosen.sort((a, b) => a - b)
}

function hasGoalPixelAt(mask: Uint8Array, width: number, height: number, x: number, y: number, band: number): boolean {
  for (let by = -band; by <= band; by += 1) {
    for (let bx = -band; bx <= band; bx += 1) {
      const px = Math.round(x + bx)
      const py = Math.round(y + by)
      if (px < 0 || py < 0 || px >= width || py >= height) continue
      if (mask[py * width + px]) return true
    }
  }
  return false
}

function verticalCoverage(mask: Uint8Array, width: number, height: number, x: number, top: number, bottom: number): number {
  let covered = 0
  let total = 0
  for (let y = Math.round(top); y <= Math.round(bottom); y += 1) {
    total += 1
    if (hasGoalPixelAt(mask, width, height, x, y, 3)) covered += 1
  }
  return total > 0 ? covered / total : 0
}

function horizontalCoverage(mask: Uint8Array, width: number, height: number, y: number, left: number, right: number): number {
  let covered = 0
  let total = 0
  for (let x = Math.round(left); x <= Math.round(right); x += 1) {
    total += 1
    if (hasGoalPixelAt(mask, width, height, x, y, 2)) covered += 1
  }
  return total > 0 ? covered / total : 0
}

function verticalExtent(mask: Uint8Array, width: number, height: number, x: number, topHint: number): { top: number; bottom: number } | undefined {
  const rows: number[] = []
  for (let y = Math.max(0, Math.round(topHint - height * 0.08)); y < height; y += 1) {
    if (hasGoalPixelAt(mask, width, height, x, y, 3)) rows.push(y)
  }
  if (rows.length < height * 0.08) return undefined
  return {
    top: rows[Math.floor(rows.length * 0.08)],
    bottom: rows[Math.floor(rows.length * 0.96)] ?? rows[rows.length - 1],
  }
}

function candidateScore(input: {
  width: number
  height: number
  leftCoverage: number
  rightCoverage: number
  topCoverage: number
  box: BoundingBox
}): { score: number; reasons: string[] } {
  const coverage = (input.leftCoverage + input.rightCoverage + input.topCoverage) / 3
  const aspect = input.box.width / Math.max(1, input.box.height)
  const aspectScore = aspect < 0.95 || aspect > 5.4 ? 0 : clamp01(1 - Math.abs(aspect - 2.25) / 3.2)
  const widthScore = clamp01(input.box.width / (input.width * 0.34))
  const heightScore = clamp01(input.box.height / (input.height * 0.28))
  const sizeScore = widthScore * 0.55 + heightScore * 0.45
  const positionScore = clamp01((input.box.y + input.box.height - input.height * 0.28) / (input.height * 0.42))
  const score = coverage * 0.52 + aspectScore * 0.18 + sizeScore * 0.2 + positionScore * 0.1
  const reasons = [
    `post coverage ${Math.round(((input.leftCoverage + input.rightCoverage) / 2) * 100)}%`,
    `crossbar coverage ${Math.round(input.topCoverage * 100)}%`,
    `shape ratio ${aspect.toFixed(1)}:1`,
  ]
  return { score, reasons }
}

export function detectGoalCandidateFromImageData(image: ImageLike, frame: Pick<VisionFrame, 'width' | 'height' | 'timestamp'>): GoalAutoSuggestion | undefined {
  const width = image.width
  const height = image.height
  const mask = new Uint8Array(width * height)
  const columnCounts = Array.from({ length: width }, () => 0)
  const rowCounts = Array.from({ length: height }, () => 0)
  const topLimit = Math.round(height * 0.05)
  const bottomLimit = Math.round(height * 0.95)

  for (let y = topLimit; y < bottomLimit; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      if (!isGoalPixel(image.data, index)) continue
      mask[y * width + x] = 1
      columnCounts[x] += 1
      rowCounts[y] += 1
    }
  }

  const columns = smoothHistogram(columnCounts, 2)
  const rows = smoothHistogram(rowCounts, 2)
  const postPeaks = findPeaks(columns, Math.max(10, height * 0.18), Math.max(8, width * 0.035), 12)
  const barPeaks = findPeaks(rows, Math.max(14, width * 0.14), Math.max(5, height * 0.035), 12)
  let best: { box: BoundingBox; score: number; reasons: string[] } | undefined

  for (let leftIndex = 0; leftIndex < postPeaks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < postPeaks.length; rightIndex += 1) {
      const left = postPeaks[leftIndex]
      const right = postPeaks[rightIndex]
      const goalWidth = right - left
      if (goalWidth < width * 0.18 || goalWidth > width * 0.86) continue

      const usableBars = barPeaks.filter((bar) => bar > topLimit && bar < bottomLimit - height * 0.1 && horizontalCoverage(mask, width, height, bar, left, right) >= 0.28)
      for (const top of usableBars) {
        const leftExtent = verticalExtent(mask, width, height, left, top)
        const rightExtent = verticalExtent(mask, width, height, right, top)
        if (!leftExtent || !rightExtent) continue
        const bottom = Math.max(leftExtent.bottom, rightExtent.bottom)
        const goalHeight = bottom - top
        if (goalHeight < height * 0.14 || goalHeight > height * 0.78) continue

        const leftCoverage = verticalCoverage(mask, width, height, left, top, bottom)
        const rightCoverage = verticalCoverage(mask, width, height, right, top, bottom)
        const topCoverage = horizontalCoverage(mask, width, height, top, left, right)
        if (leftCoverage < 0.3 || rightCoverage < 0.3 || topCoverage < 0.28) continue

        const box = { x: left, y: top, width: goalWidth, height: goalHeight }
        const scored = candidateScore({ width, height, leftCoverage, rightCoverage, topCoverage, box })
        if (scored.score < 0.42) continue
        if (!best || scored.score > best.score) best = { box, score: scored.score, reasons: scored.reasons }
      }
    }
  }

  if (!best) return undefined
  const scaled = scaleBox(best.box, { width, height }, frame)
  return {
    status: best.score >= 0.62 ? 'suggesting' : 'scanning',
    goal: goalFromBox(scaled),
    box: scaled,
    confidence: confidence(best.score, best.reasons),
    stableFrames: 1,
    updatedAt: frame.timestamp,
    applied: false,
  }
}

function sameGoalCandidate(previous: StableGoalCandidate, next: GoalAutoSuggestion): boolean {
  const previousCentre = boxCenter(previous.box)
  const nextCentre = boxCenter(next.box)
  const maxMove = Math.max(36, Math.max(previous.box.width, previous.box.height) * 0.16)
  const areaRatio = (next.box.width * next.box.height) / Math.max(1, previous.box.width * previous.box.height)
  return distance(previousCentre, nextCentre) <= maxMove && areaRatio >= 0.62 && areaRatio <= 1.62
}

function suggestionFromStable(stable: StableGoalCandidate, applied: boolean): GoalAutoSuggestion {
  const stableScore = clamp01(stable.stableFrames / STABLE_GOAL_FRAMES)
  const score = stable.confidence.score * 0.74 + stableScore * 0.26
  return {
    status: stable.stableFrames >= STABLE_GOAL_FRAMES && score >= 0.64 ? 'locked' : 'suggesting',
    goal: goalFromBox(stable.box),
    box: stable.box,
    confidence: confidence(score, [...stable.confidence.reasons, `stable ${stable.stableFrames}/${STABLE_GOAL_FRAMES}`]),
    stableFrames: stable.stableFrames,
    updatedAt: stable.updatedAt,
    applied,
  }
}

export class GoalAutoDetector {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private stable?: StableGoalCandidate
  private lastSuggestion?: GoalAutoSuggestion

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = SCAN_W
    this.canvas.height = SCAN_H
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    this.ctx = ctx
  }

  reset(): void {
    this.stable = undefined
    this.lastSuggestion = undefined
  }

  update(video: HTMLVideoElement, frame: VisionFrame, applied = false): GoalAutoSuggestion | undefined {
    if (frame.index % SCAN_EVERY_FRAMES !== 0) {
      if (this.lastSuggestion && frame.timestamp - this.lastSuggestion.updatedAt < CANDIDATE_MEMORY_MS) return { ...this.lastSuggestion, applied }
      return undefined
    }

    this.ctx.drawImage(video, 0, 0, SCAN_W, SCAN_H)
    const image = this.ctx.getImageData(0, 0, SCAN_W, SCAN_H)
    const candidate = detectGoalCandidateFromImageData(image, frame)
    if (!candidate) {
      if (this.stable && frame.timestamp - this.stable.updatedAt < CANDIDATE_MEMORY_MS) {
        this.lastSuggestion = suggestionFromStable(this.stable, applied)
        return this.lastSuggestion
      }
      this.stable = undefined
      this.lastSuggestion = undefined
      return undefined
    }

    if (this.stable && sameGoalCandidate(this.stable, candidate)) {
      const box = smoothBox(this.stable.box, candidate.box, 0.34)
      this.stable = {
        ...candidate,
        box,
        goal: goalFromBox(box),
        stableFrames: this.stable.stableFrames + 1,
      }
    } else {
      this.stable = { ...candidate, stableFrames: 1 }
    }

    this.lastSuggestion = suggestionFromStable(this.stable, applied)
    return this.lastSuggestion
  }
}

export function goalAutoSuggestionCentre(suggestion: GoalAutoSuggestion): Point2D {
  return boxCenter(suggestion.box)
}
