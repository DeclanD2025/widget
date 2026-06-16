import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Page from '../components/Page'
import { usePlayer, useSkills, useStreak } from '../hooks/useData'
import { ovr, levelForXp } from '../lib/game'

export default function Start() {
  const nav = useNavigate()
  const player = usePlayer()
  const skills = useSkills()
  const streak = useStreak()

  // First run — send the player into onboarding.
  if (player === undefined || skills === undefined) {
    return (
      <Page>
        <div className="grid h-[70vh] place-items-center text-white/50">Loading…</div>
      </Page>
    )
  }

  if (player === null) {
    return (
      <Page>
        <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 160 }}
            className="text-8xl"
          >
            ⚽
          </motion.div>
          <h1 className="mt-4 text-4xl font-extrabold">Garden Baller</h1>
          <p className="mt-2 max-w-xs text-white/70">
            Train like a pro using just your garden, goals, fences, cones and a ball.
          </p>
          <button onClick={() => nav('/profile')} className="btn-primary mt-8 w-full max-w-xs py-4 text-xl">
            Create my player ⚡
          </button>
        </div>
      </Page>
    )
  }

  const rating = ovr(skills)
  const { level } = levelForXp(player.xp)

  return (
    <Page>
      <div className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm text-white/60">Welcome back,</div>
          <div className="text-2xl font-extrabold">{player.name || 'Baller'} {player.avatar}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 font-bold">
            🔥 <span className="tabular-nums">{streak?.currentStreak ?? 0}</span>
          </div>
          <Link to="/settings" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl" aria-label="Settings">⚙️</Link>
        </div>
      </div>

      <div className="card mt-2 flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">Rating</div>
          <div className="text-5xl font-extrabold tabular-nums">{rating}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-white/50">Level</div>
          <div className="text-5xl font-extrabold tabular-nums">{level}</div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => nav('/today')}
        className="btn-primary mt-4 w-full py-6 text-2xl"
      >
        ▶︎ Train Now
      </motion.button>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/modes" className="card flex flex-col gap-1 p-4 active:scale-95">
          <span className="text-3xl">🎮</span>
          <span className="font-bold">Training Modes</span>
          <span className="text-xs text-white/60">Pick how you play</span>
        </Link>
        <Link to="/missions" className="card flex flex-col gap-1 p-4 active:scale-95">
          <span className="text-3xl">🎯</span>
          <span className="font-bold">Weekly Mission</span>
          <span className="text-xs text-white/60">Challenges to smash</span>
        </Link>
        <Link to="/dashboard" className="card flex flex-col gap-1 p-4 active:scale-95">
          <span className="text-3xl">📊</span>
          <span className="font-bold">My Stats</span>
          <span className="text-xs text-white/60">Watch yourself improve</span>
        </Link>
        <Link to="/badges" className="card flex flex-col gap-1 p-4 active:scale-95">
          <span className="text-3xl">🏅</span>
          <span className="font-bold">Badges</span>
          <span className="text-xs text-white/60">Trophies & unlocks</span>
        </Link>
      </div>
    </Page>
  )
}
