import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Flame, Settings, Gamepad2, Target, BarChart3, MapPin } from 'lucide-react'
import Page from '../components/Page'
import { usePlayer, useSkills, useStreak } from '../hooks/useData'
import { ovr, levelForXp } from '../lib/game'

export default function Start() {
  const nav = useNavigate()
  const player = usePlayer()
  const skills = useSkills()
  const streak = useStreak()

  if (!player || !skills) {
    return (
      <Page>
        <div className="grid h-[70vh] place-items-center text-white/40">Loading…</div>
      </Page>
    )
  }

  const rating = ovr(skills)
  const { level, intoLevel, span } = levelForXp(player.xp)
  const pct = Math.round((intoLevel / span) * 100)

  const tiles = [
    { to: '/modes', label: 'Training Modes', sub: 'Pick how you play', Icon: Gamepad2 },
    { to: '/garden', label: 'My Garden', sub: 'Set up your pitch', Icon: MapPin },
    { to: '/missions', label: 'Weekly Mission', sub: 'Challenges to smash', Icon: Target },
    { to: '/dashboard', label: 'My Stats', sub: 'Track your rise', Icon: BarChart3 },
  ]

  return (
    <Page>
      <div className="flex items-center justify-between py-2">
        <div>
          <div className="label">Welcome back</div>
          <div className="num text-3xl font-extrabold uppercase">{player.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-bold">
            <Flame size={16} className="text-gold" />
            <span className="num">{streak?.currentStreak ?? 0}</span>
          </div>
          <Link to="/settings" className="btn-ghost h-10 w-10" aria-label="Settings">
            <Settings size={18} />
          </Link>
        </div>
      </div>

      <div className="card card-hi mt-2 flex items-center justify-between p-5">
        <div>
          <div className="label">Rating</div>
          <div className="num text-6xl font-extrabold leading-none text-gold">{rating}</div>
        </div>
        <div className="h-12 w-px bg-white/10" />
        <div className="text-right">
          <div className="label">Level {level}</div>
          <div className="num text-6xl font-extrabold leading-none">{level}</div>
        </div>
      </div>

      <div className="mt-2 px-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gold-grad" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-right text-[11px] font-medium text-white/45">{intoLevel} / {span} XP</div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => nav('/today')}
        className="btn-emerald mt-4 w-full py-5 text-2xl font-extrabold uppercase"
      >
        <Play size={26} fill="currentColor" /> Train Now
      </motion.button>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map(({ to, label, sub, Icon }) => (
          <Link key={to} to={to} className="card card-hi flex flex-col gap-2 p-4 active:scale-[0.97]">
            <Icon size={26} className="text-emerald-glow" />
            <span className="font-bold leading-tight">{label}</span>
            <span className="text-xs text-white/45">{sub}</span>
          </Link>
        ))}
      </div>
    </Page>
  )
}
