import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Lock,
  Flag,
  Flame,
  Crosshair,
  Footprints,
  Waypoints,
  HeartPulse,
  Star,
  Trophy,
  Zap,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'
import Page from '../components/Page'
import { useBadges, usePlayer } from '../hooks/useData'
import { DRILLS } from '../data/drills'
import { DrillIcon } from '../components/icons'
import { levelForXp } from '../lib/game'

const BADGE_ICON: Record<string, LucideIcon> = {
  'first-session': Flag,
  'streak-3': Flame,
  'streak-7': Flame,
  sniper: Crosshair,
  'weak-wand': Footprints,
  'cone-magician': Waypoints,
  'iron-lungs': HeartPulse,
  'level-5': Star,
  'level-10': Trophy,
  'pb-breaker': Zap,
  juggler: CircleDot,
}

export default function Badges() {
  const badges = useBadges()
  const player = usePlayer()
  const level = player ? levelForXp(player.xp).level : 1
  const earned = badges?.filter((b) => b.earnedAt).length ?? 0

  return (
    <Page title="Awards" kicker="Trophies & unlocks" back>
      <p className="mb-3 num text-white/55">{earned}/{badges?.length ?? 0} badges earned</p>
      <div className="grid grid-cols-3 gap-3">
        {(badges ?? []).map((b) => {
          const Icon = BADGE_ICON[b.id] ?? Trophy
          const on = !!b.earnedAt
          return (
            <motion.div
              key={b.id}
              whileTap={{ scale: 0.96 }}
              className={`card flex flex-col items-center gap-2 p-3 text-center ${on ? '' : 'opacity-50'}`}
              title={b.description}
            >
              <span className={`grid h-12 w-12 place-items-center rounded-full ${on ? 'bg-gold/15 text-gold' : 'bg-white/5 text-white/40'}`}>
                {on ? <Icon size={24} /> : <Lock size={20} />}
              </span>
              <span className="text-xs font-semibold leading-tight">{b.name}</span>
            </motion.div>
          )
        })}
      </div>

      <h2 className="mb-1 mt-8 label">Drill cards</h2>
      <p className="mb-3 text-sm text-white/45">New drills unlock as Caiden levels up.</p>
      <div className="grid grid-cols-2 gap-3">
        {DRILLS.map((d) => {
          const locked = d.unlockLevel > level
          if (locked) {
            return (
              <div key={d.id} className="card flex items-center gap-3 p-3 opacity-50">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-white/40"><Lock size={18} /></span>
                <span className="text-sm font-semibold leading-tight">Unlock at Lv {d.unlockLevel}</span>
              </div>
            )
          }
          return (
            <Link key={d.id} to={`/drills/${d.id}`} className="card flex items-center gap-3 p-3 active:scale-[0.97]">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-glow/15 text-emerald-glow">
                <DrillIcon drillId={d.id} size={20} />
              </span>
              <span className="text-sm font-semibold leading-tight">{d.name}</span>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}
