import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Confetti from '../components/Confetti'
import SkillBar from '../components/SkillBar'
import { useRunStore } from '../store/run'
import { useSkills } from '../hooks/useData'
import type { SkillKey } from '../types'

export default function Done() {
  const nav = useNavigate()
  const summary = useRunStore((s) => s.summary)
  const clear = useRunStore((s) => s.clearSummary)
  const skills = useSkills()

  // If the page is reloaded with no fresh result, go home.
  useEffect(() => {
    if (!summary) nav('/', { replace: true })
  }, [summary, nav])

  if (!summary || !skills) return null

  const changed = skills.filter((s) => summary.skillDeltas[s.key as SkillKey])

  function finish() {
    clear()
    nav('/')
  }

  return (
    <div className="safe-top flex min-h-screen flex-col px-5 pb-8">
      <Confetti />

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180 }}
        className="mt-8 text-center"
      >
        <div className="text-7xl">🎉</div>
        <h1 className="mt-2 text-4xl font-extrabold">Session done!</h1>
      </motion.div>

      {summary.leveledUp && (
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="mt-4 rounded-3xl bg-gradient-to-r from-amber-400 to-yellow-600 p-4 text-center text-baller-ink shadow-glow"
        >
          <div className="text-sm font-bold uppercase tracking-widest">Level up!</div>
          <div className="text-3xl font-extrabold">You reached Level {summary.levelAfter} ⭐</div>
        </motion.div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="card p-3">
          <div className="text-3xl font-extrabold tabular-nums">+{summary.xpEarned}</div>
          <div className="text-xs text-white/60">XP</div>
        </div>
        <div className="card p-3">
          <div className="text-3xl font-extrabold tabular-nums">🔥{summary.streak}</div>
          <div className="text-xs text-white/60">Streak</div>
        </div>
        <div className="card p-3">
          <div className="text-3xl font-extrabold tabular-nums">{summary.beatPBs}</div>
          <div className="text-xs text-white/60">New bests</div>
        </div>
      </div>

      {changed.length > 0 && (
        <div className="card mt-4 space-y-3 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">Skills up</h2>
          {changed.map((s) => {
            const delta = summary.skillDeltas[s.key as SkillKey]!
            return <SkillBar key={s.key} skill={s.key} value={s.value} delta={delta} animateFrom={s.value - delta} />
          })}
        </div>
      )}

      {summary.newBadges.length > 0 && (
        <div className="mt-4 space-y-2">
          {summary.newBadges.map((b) => (
            <motion.div
              key={b.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card flex items-center gap-3 p-3"
            >
              <span className="text-3xl">{b.emoji}</span>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-pitch-light">Badge unlocked</div>
                <div className="font-extrabold">{b.name}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex-1" />
      <button onClick={finish} className="btn-primary mt-6 w-full py-5 text-2xl">Awesome! 🙌</button>
    </div>
  )
}
