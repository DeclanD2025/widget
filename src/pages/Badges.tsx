import Page from '../components/Page'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useBadges, usePlayer } from '../hooks/useData'
import { DRILLS } from '../data/drills'
import { levelForXp } from '../lib/game'

export default function Badges() {
  const badges = useBadges()
  const player = usePlayer()
  const level = player ? levelForXp(player.xp).level : 1

  const earned = badges?.filter((b) => b.earnedAt).length ?? 0

  return (
    <Page title="Badges" back>
      <p className="mb-3 text-white/60">{earned}/{badges?.length ?? 0} badges unlocked</p>
      <div className="grid grid-cols-3 gap-3">
        {(badges ?? []).map((b) => (
          <motion.div
            key={b.id}
            whileTap={{ scale: 0.95 }}
            className={`card flex flex-col items-center gap-1 p-3 text-center ${b.earnedAt ? '' : 'opacity-40 grayscale'}`}
            title={b.description}
          >
            <span className="text-4xl">{b.earnedAt ? b.emoji : '🔒'}</span>
            <span className="text-xs font-bold leading-tight">{b.name}</span>
          </motion.div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 text-sm font-bold uppercase tracking-widest text-white/60">Drill cards</h2>
      <p className="mb-3 text-sm text-white/50">New drills unlock as you level up. Tap a card for details.</p>
      <div className="grid grid-cols-2 gap-3">
        {DRILLS.map((d) => {
          const locked = d.unlockLevel > level
          if (locked) {
            return (
              <div key={d.id} className="card flex items-center gap-3 p-3 opacity-50">
                <span className="text-3xl">🔒</span>
                <span className="text-sm font-bold leading-tight">Unlock at Lv {d.unlockLevel}</span>
              </div>
            )
          }
          return (
            <Link key={d.id} to={`/drills/${d.id}`} className="card flex items-center gap-3 p-3 active:scale-95">
              <span className="text-3xl">{d.emoji}</span>
              <span className="text-sm font-bold leading-tight">{d.name}</span>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}
