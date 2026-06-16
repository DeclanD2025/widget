import { motion } from 'framer-motion'
import { useMemo } from 'react'

const COLOURS = ['#f4c95d', '#1fd17a', '#ffffff', '#46e79a', '#caa23f', '#d4dbd7']

/** A burst of confetti for celebrations. Pure CSS/Framer — no canvas needed. */
export default function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.4 + Math.random() * 1.2,
        colour: COLOURS[i % COLOURS.length],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 8,
      })),
    [count],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: '-10%', x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', rotate: p.rotate + 360, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.colour,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  )
}
