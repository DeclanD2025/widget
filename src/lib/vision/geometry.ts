import type { BoundingBox, Point2D, Polygon, Vector2D } from './types'

export function point(x: number, y: number): Point2D {
  return { x, y }
}

export function vector(a: Point2D, b: Point2D): Vector2D {
  return { x: b.x - a.x, y: b.y - a.y }
}

export function add(a: Point2D, b: Vector2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function subtract(a: Point2D, b: Point2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function magnitude(v: Vector2D): number {
  return Math.hypot(v.x, v.y)
}

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function normalize(v: Vector2D): Vector2D {
  const len = magnitude(v)
  if (len <= 1e-9) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function dot(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y
}

export function angleDeg(v: Vector2D): number {
  return (Math.atan2(v.y, v.x) * 180) / Math.PI
}

export function boxCenter(box: BoundingBox): Point2D {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export function boxArea(box: BoundingBox): number {
  return Math.max(0, box.width) * Math.max(0, box.height)
}

export function boxFromPoints(points: Point2D[], padding = 0): BoundingBox {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs) - padding
  const minY = Math.min(...ys) - padding
  const maxX = Math.max(...xs) + padding
  const maxY = Math.max(...ys) + padding
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

export function scalePoint(pointToScale: Point2D, from: { width: number; height: number }, to: { width: number; height: number }): Point2D {
  return {
    x: from.width > 0 ? (pointToScale.x / from.width) * to.width : pointToScale.x,
    y: from.height > 0 ? (pointToScale.y / from.height) * to.height : pointToScale.y,
  }
}

export function scaleBox(box: BoundingBox, from: { width: number; height: number }, to: { width: number; height: number }): BoundingBox {
  const topLeft = scalePoint({ x: box.x, y: box.y }, from, to)
  const bottomRight = scalePoint({ x: box.x + box.width, y: box.y + box.height }, from, to)
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  }
}

export function pointInBox(p: Point2D, box: BoundingBox): boolean {
  return p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height
}

export function pointInPolygon(pointToCheck: Point2D, polygon: Polygon): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses = a.y > pointToCheck.y !== b.y > pointToCheck.y
    const atX = ((b.x - a.x) * (pointToCheck.y - a.y)) / ((b.y - a.y) || 1e-9) + a.x
    if (crosses && pointToCheck.x < atX) inside = !inside
  }
  return inside
}

export function closestPointOnSegment(p: Point2D, a: Point2D, b: Point2D): Point2D {
  const ab = subtract(b, a)
  const lengthSq = dot(ab, ab)
  if (lengthSq <= 1e-9) return a
  const t = Math.max(0, Math.min(1, dot(subtract(p, a), ab) / lengthSq))
  return { x: a.x + ab.x * t, y: a.y + ab.y * t }
}

export function distancePointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  return distance(p, closestPointOnSegment(p, a, b))
}

export function signedDistanceFromLine(p: Point2D, a: Point2D, b: Point2D): number {
  const ab = subtract(b, a)
  const ap = subtract(p, a)
  const length = magnitude(ab)
  if (length <= 1e-9) return 0
  return (ab.x * ap.y - ab.y * ap.x) / length
}

export function polylineLength(points: Point2D[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i])
  return total
}

export function maxLateralDeviation(points: Point2D[]): { deviation: number; signed: number } {
  if (points.length < 3) return { deviation: 0, signed: 0 }
  const start = points[0]
  const end = points[points.length - 1]
  let max = 0
  let signed = 0
  for (const p of points.slice(1, -1)) {
    const d = signedDistanceFromLine(p, start, end)
    if (Math.abs(d) > Math.abs(max)) {
      max = d
      signed = d
    }
  }
  return { deviation: Math.abs(max), signed }
}

export function lineCrossesHorizontalBetween(a: Point2D, b: Point2D, y: number): Point2D | undefined {
  if ((a.y < y && b.y < y) || (a.y > y && b.y > y) || a.y === b.y) return undefined
  const t = (y - a.y) / (b.y - a.y)
  if (t < 0 || t > 1) return undefined
  return { x: a.x + (b.x - a.x) * t, y }
}

export function averagePoint(points: Point2D[]): Point2D | undefined {
  if (points.length === 0) return undefined
  const total = points.reduce(
    (sum, p) => {
      sum.x += p.x
      sum.y += p.y
      return sum
    },
    { x: 0, y: 0 },
  )
  return { x: total.x / points.length, y: total.y / points.length }
}
