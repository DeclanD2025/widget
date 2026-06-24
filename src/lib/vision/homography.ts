import type { Point2D } from './types'

function solve(A: number[][], b: number[]): number[] {
  const n = b.length
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row
    }
    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    ;[b[col], b[pivot]] = [b[pivot], b[col]]

    const div = A[col][col] || 1e-9
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = A[row][col] / div
      for (let c = col; c < n; c++) A[row][c] -= factor * A[col][c]
      b[row] -= factor * b[col]
    }
  }
  return b.map((value, index) => value / (A[index][index] || 1e-9))
}

export function computeHomography(src: Point2D[], dst: Point2D[]): number[] | undefined {
  if (src.length !== 4 || dst.length !== 4) return undefined
  const A: number[][] = []
  const values: number[] = []

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]
    const { x: u, y: v } = dst[i]
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u])
    values.push(u)
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v])
    values.push(v)
  }

  return solve(A, values)
}

export function applyHomography(point: Point2D, h?: number[]): Point2D {
  if (!h || h.length < 8) return point
  const [a, b, c, d, e, f, g, i] = h
  const denom = g * point.x + i * point.y + 1 || 1e-9
  return {
    x: (a * point.x + b * point.y + c) / denom,
    y: (d * point.x + e * point.y + f) / denom,
  }
}

export function buildGroundHomography(groundPlane: Point2D[]): number[] | undefined {
  if (groundPlane.length !== 4) return undefined
  const dst = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ]
  return computeHomography(groundPlane, dst)
}
