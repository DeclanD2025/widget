import { motion } from 'framer-motion'
import type { Player, SkillRow } from '../types'
import { SKILL_LABELS } from '../types'
import { ovr, cardTier, levelForXp } from '../lib/game'

/** FIFA Ultimate Team-style player rating card. */
export default function PlayerCard({
  player,
  skills,
}: {
  player: Player
  skills: SkillRow[]
}) {
  const rating = ovr(skills)
  const tier = cardTier(rating)
  const { level } = levelForXp(player.xp)

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0, rotateX: -8 }}
      animate={{ scale: 1, opacity: 1, rotateX: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className={`relative mx-auto w-full max-w-xs rounded-3xl bg-gradient-to-b ${tier.bg} p-5 shadow-card ring-2 ${tier.ring}`}
    >
      <div className="flex items-start justify-between">
        <div className="text-center leading-none">
          <div className="text-5xl font-extrabold tabular-nums">{rating}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/70">OVR</div>
          <div className="mt-2 inline-block rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            {tier.label}
          </div>
        </div>
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl text-5xl shadow-inner"
          style={{ backgroundColor: player.colour }}
        >
          {player.avatar}
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="truncate text-2xl font-extrabold">{player.name || 'Baller'}</div>
        <div className="text-xs font-semibold text-white/70">
          Level {level} · {player.strongFoot === 'L' ? 'Left' : 'Right'} footed
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {skills.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-sm">
            <span className="text-white/70">{SKILL_LABELS[s.key].slice(0, 3).toUpperCase()}</span>
            <span className="font-bold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
