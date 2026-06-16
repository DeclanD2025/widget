// Generate the app's PNG icons with zero dependencies (pure Node + zlib).
// Draws a green rounded square, a white "ball" circle, and a dark pentagon.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const GREEN = [21, 128, 61]
const WHITE = [240, 253, 244]
const INK = [10, 15, 10]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function inPentagon(px, py, cx, cy, r) {
  // Point-in-regular-pentagon test (pointing up).
  for (let i = 0; i < 5; i++) {
    const a1 = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const a2 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 5
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
    const cross = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)
    if (cross < 0) return false
  }
  return true
}

function makePng(size) {
  const data = Buffer.alloc(size * (size * 4 + 1))
  const radius = size * 0.42
  const cx = size / 2, cy = size / 2
  const corner = size * 0.19
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    data[rowStart] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      // Rounded-corner mask for the background square.
      let rounded = true
      const rx = Math.min(x, size - 1 - x)
      const ry = Math.min(y, size - 1 - y)
      if (rx < corner && ry < corner) {
        const dx = corner - rx, dy = corner - ry
        rounded = dx * dx + dy * dy <= corner * corner
      }
      let col = GREEN
      const dist = Math.hypot(x - cx, y - cy)
      if (dist <= radius) col = WHITE
      if (inPentagon(x, y, cx, cy, radius * 0.55)) col = INK
      const o = rowStart + 1 + x * 4
      const a = rounded ? 255 : 0
      data[o] = col[0]
      data[o + 1] = col[1]
      data[o + 2] = col[2]
      data[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(data)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return png
}

mkdirSync('public', { recursive: true })
const targets = [
  ['public/pwa-192.png', 192],
  ['public/pwa-512.png', 512],
  ['public/apple-touch-icon.png', 180],
]
for (const [path, size] of targets) {
  writeFileSync(path, makePng(size))
  console.log('wrote', path, size)
}
