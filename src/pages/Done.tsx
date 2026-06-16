import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flame, Zap, TrendingUp, Award, ChevronUp } from 'lucide-react'
import Confetti from '../components/Confetti'
import SkillBar from '../components/SkillBar'
import { useRunStore } from '../store/run'
import { useSkills } from '../hooks/useData'
import { cheer, fanfare } from '../lib/sound'
import type { SkillKey } from '../types'

export default function Done() {
  const nav = useNavigate()
  const summary = useRunStore((s) => s.summary)
  const clear = useRunStore((s) => s.clearSummary)
  const skills = useSkills()

  useEffect(() => {
    if (!summary) {
      nav('/', { replace: true })
      return
    }
    if (summary.leveledUp) fanfare()
    else cheer()
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

      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 180 }} className="mt-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold/15 text-gold">
          <Award size={44} />
        </div>
        <h1 className="mt-3 text-4xl font-extrabold uppercase">Session done</h1>
      </motion.div>

      {summary.leveledUp && (
        <motion.div initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3, type: 'spring' }} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-gold-grad p-4 text-center text-base-900 shadow-gold">
          <ChevronUp size={24} strokeWidth={3} />
          <span className="num text-2xl font-extrabold uppercase">Level up — now Level {summary.levelAfter}</span>
        </motion.div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[
          { Icon: Zap, val: `+${summary.xpEarned}`, label: 'XP' },
          { Icon: Flame, val: `${summary.streak}`, label: 'Streak' },
          { Icon: TrendingUp, val: `${summary.beatPBs}`, label: 'New bests' },
        ].map((s) => (
          <div key={s.label} className="card card-hi p-3">
            <s.Icon size={20} className="mx-auto text-emerald-glow" />
            <div className="num mt-1 text-3xl font-extrabold">{s.val}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      {changed.length > 0 && (
        <div className="card mt-4 space-y-3 p-4">
          <h2 className="label">Skills up</h2>
          {changed.map((s) => {
            const delta = summary.skillDeltas[s.key as SkillKey]!
            return <SkillBar key={s.key} skill={s.key} value={s.value} delta={delta} animateFrom={s.value - delta} />
          })}
        </div>
      )}

      {summary.newBadges.length > 0 && (
        <div className="mt-4 space-y-2">
          {summary.newBadges.map((b) => (
            <motion.div key={b.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card flex items-center gap-3 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gold/15 text-gold"><Award size={20} /></span>
              <div>
                <div className="label text-gold">Badge unlocked</div>
                <div className="font-bold">{b.name}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex-1" />
      <button onClick={finish} className="btn-primary mt-6 w-full py-5 text-2xl font-extrabold uppercase">Continue</button>
    </div>
  )
}
