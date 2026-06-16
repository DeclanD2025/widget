import { motion } from 'framer-motion'
import type { SkillKey } from '../types'
import { SKILL_LABELS } from '../types'

function colourFor(value: number): string {
  if (value >= 85) return '#a78bfa'
  if (value >= 75) return '#fbbf24'
  if (value >= 60) return '#cbd5e1'
  return '#fb923c'
}

interface Props {
  skill: SkillKey
  value: number
  delta?: number
  /** When true the bar animates up from its previous value. */
  animateFrom?: number
}

/** A single labelled skill bar (0-99) with an optional "+N" gain badge. */
export default function SkillBar({ skill, value, delta, animateFrom }: Props) {
  const from = animateFrom ?? value
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 text-sm font-semibold text-white/80">{SKILL_LABELS[skill]}</div>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: colourFor(value) }}
          initial={{ width: `${from}%` }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
      <div className="w-12 shrink-0 text-right tabular-nums font-bold">
        {value}
        {delta ? <span className="ml-1 text-xs text-pitch-light">+{delta}</span> : null}
      </div>
    </div>
  )
}
