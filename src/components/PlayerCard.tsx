import { motion } from 'framer-motion'
import type { Player, SkillRow } from '../types'
import { SKILL_LABELS } from '../types'
import { ovr, cardTier, levelForXp } from '../lib/game'
import Crest from './Crest'

/** EA-FC-style player rating card. */
export default function PlayerCard({ player, skills }: { player: Player; skills: SkillRow[] }) {
  const rating = ovr(skills)
  const tier = cardTier(rating)
  const { level } = levelForXp(player.xp)

  return (
    <motion.div
      initial={{ scale: 0.94, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className="card card-hi mx-auto w-full max-w-xs overflow-hidden p-0"
    >
      {/* Tier banner */}
      <div className={`bg-gradient-to-b ${tier.grad} px-5 pb-4 pt-5`}>
        <div className="flex items-start justify-between">
          <div className="leading-none">
            <div className="num text-6xl font-extrabold text-white drop-shadow">{rating}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/80">Overall</div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {tier.label}
            </div>
          </div>
          <Crest name={player.name} colour={player.colour} size={84} />
        </div>
        <div className="mt-3">
          <div className="num truncate text-2xl font-extrabold uppercase tracking-wide text-white">
            {player.name || 'Caiden'}
          </div>
          <div className="text-xs font-semibold text-white/70">
            Level {level} · {player.strongFoot === 'L' ? 'Left' : 'Right'} foot · Age {player.age}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 px-5 py-4">
        {skills.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-sm">
            <span className="text-white/55">{SKILL_LABELS[s.key]}</span>
            <span className="num text-lg font-bold">{s.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
