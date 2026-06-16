// Perspective-transform helpers: map the four tapped grass corners of a photo
// onto a clean top-down rectangle so drill overlays can be drawn on the pitch.

export interface Pt {
  x: number
  y: number
}

/** Solve an 8x8 linear system with Gaussian elimination (partial pivoting). */
function solve8(A: number[][], b: number[]): number[] {
  const n = 8
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r
    }
    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    ;[b[col], b[pivot]] = [b[pivot], b[col]]
    const d = A[col][col] || 1e-9
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = A[r][col] / d
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c]
      b[r] -= f * b[col]
    }
  }
  return b.map((v, i) => v / (A[i][i] || 1e-9))
}

/**
 * Homography mapping 4 source points -> 4 destination points.
 * Returns [a,b,c,d,e,f,g,h] for the 3x3 matrix [[a,b,c],[d,e,f],[g,h,1]].
 */
export function computeHomography(src: Pt[], dst: Pt[]): number[] {
  const A: number[][] = []
  const bv: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]
    const { x: u, y: v } = dst[i]
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u])
    bv.push(u)
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v])
    bv.push(v)
  }
  return solve8(A, bv)
}

/** Build a CSS matrix3d() string from the homography coefficients. */
export function toMatrix3d(h: number[]): string {
  const [a, b, c, d, e, f, g, hh] = h
  // column-major 4x4
  const m = [a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1]
  return `matrix3d(${m.join(',')})`
}

/** Convenience: the transform that flattens `src` corners into a W×H rectangle. */
export function flattenTransform(src: Pt[], w: number, h: number): string {
  const dst: Pt[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ]
  return toMatrix3d(computeHomography(src, dst))
}
