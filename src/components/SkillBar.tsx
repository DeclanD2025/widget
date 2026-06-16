import { motion } from 'framer-motion'
import type { SkillKey } from '../types'
import { SKILL_LABELS } from '../types'
import { SkillIcon } from './icons'

function colourFor(value: number): string {
  if (value >= 85) return '#d946ef'
  if (value >= 75) return '#f4c95d'
  if (value >= 60) return '#cbd5e1'
  return '#1fd17a'
}

interface Props {
  skill: SkillKey
  value: number
  delta?: number
  animateFrom?: number
}

/** A labelled skill bar (0-99) with an optional "+N" gain. */
export default function SkillBar({ skill, value, delta, animateFrom }: Props) {
  const from = animateFrom ?? value
  const colour = colourFor(value)
  return (
    <div className="flex items-center gap-3">
      <SkillIcon skill={skill} size={18} className="shrink-0 text-white/55" />
      <div className="w-24 shrink-0 text-sm font-medium text-white/75">{SKILL_LABELS[skill]}</div>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: colour, boxShadow: `0 0 12px ${colour}66` }}
          initial={{ width: `${from}%` }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
      <div className="num w-12 shrink-0 text-right text-lg font-bold">
        {value}
        {delta ? <span className="ml-1 text-xs font-bold text-emerald-glow">+{delta}</span> : null}
      </div>
    </div>
  )
}
