import { useState } from 'react'
import { motion } from 'framer-motion'
import { CircleDot, Plus, Minus, Trophy, Zap, ChevronUp } from 'lucide-react'
import Page from '../components/Page'
import Confetti from '../components/Confetti'
import { weekStart } from '../lib/game'
import { useKeepyUppy, useKeepyUppyAllTimeBest } from '../hooks/useData'
import { saveKeepyUppyProgress, finishKeepyUppy, type KeepyUppyResult } from '../lib/keepyuppy'

export default function KeepyUppy() {
  const wk = weekStart()
  const record = useKeepyUppy(wk)
  const allTimeBest = useKeepyUppyAllTimeBest() ?? 0

  const [value, setValue] = useState(0)
  const [result, setResult] = useState<KeepyUppyResult | null>(null)

  const attempts = record?.attempts ?? []
  const done = !!record?.xpAwarded
  const remaining = 3 - attempts.length
  const weekBest = attempts.length ? Math.max(...attempts) : 0

  async function logAttempt() {
    const next = [...attempts, value]
    setValue(0)
    if (next.length >= 3) {
      const r = await finishKeepyUppy(wk, next)
      setResult(r)
    } else {
      await saveKeepyUppyProgress(wk, next)
    }
  }

  return (
    <Page title="Keepy-Up Challenge" kicker="Best of 3 · this week" back>
      {result && <Confetti />}

      <div className="card card-hi flex flex-col items-center gap-2 p-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold/15 text-gold">
          <CircleDot size={34} />
        </span>
        <h2 className="text-2xl font-extrabold">How many keepy-ups?</h2>
        <p className="text-white/60">You get <b>3 tries</b> each week — only your best counts. Catches don't, drop = attempt over!</p>
        <div className="mt-2 flex gap-6 text-center">
          <div>
            <div className="num text-3xl font-extrabold text-emerald-glow">{weekBest}</div>
            <div className="label">This week</div>
          </div>
          <div>
            <div className="num text-3xl font-extrabold text-gold">{allTimeBest}</div>
            <div className="label">All-time best</div>
          </div>
        </div>
      </div>

      {/* Attempt slots */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => {
          const v = attempts[i]
          const isBest = v !== undefined && v === weekBest && weekBest > 0
          return (
            <div key={i} className={`card flex flex-col items-center gap-1 p-4 ${isBest ? 'shadow-gold' : ''}`}>
              <div className="label">Try {i + 1}</div>
              <div className={`num text-3xl font-extrabold ${v === undefined ? 'text-white/25' : isBest ? 'text-gold' : ''}`}>
                {v === undefined ? '–' : v}
              </div>
            </div>
          )
        })}
      </div>

      {!done ? (
        <>
          <div className="mt-6 flex items-center justify-center gap-6">
            <button onClick={() => setValue((s) => Math.max(0, s - 1))} className="btn-ghost grid h-16 w-16 place-items-center"><Minus size={28} /></button>
            <div className="num w-28 text-center text-7xl font-extrabold text-gold">{value}</div>
            <button onClick={() => setValue((s) => s + 1)} className="btn-emerald grid h-16 w-16 place-items-center"><Plus size={28} /></button>
          </div>
          <button onClick={logAttempt} className="btn-primary mt-6 w-full py-5 text-xl font-extrabold uppercase">
            Log try {attempts.length + 1} {remaining === 1 ? '(last one!)' : ''}
          </button>
        </>
      ) : (
        <div className="card mt-6 p-5 text-center">
          <Trophy size={32} className="mx-auto text-gold" />
          <div className="num mt-2 text-4xl font-extrabold">Best: {weekBest}</div>
          <p className="mt-1 text-white/60">Challenge done for this week — come back next week to beat it!</p>
        </div>
      )}

      {/* Just-finished celebration */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card card-hi mt-4 p-5 text-center">
          {result.beat && <div className="label text-gold">New all-time best! ⬆</div>}
          <div className="num text-4xl font-extrabold text-gold">{result.best} keepy-ups</div>
          <div className="mt-3 flex justify-center gap-6">
            <div className="flex items-center gap-1.5 font-bold text-emerald-glow"><Zap size={18} /> +{result.xpEarned} XP</div>
            {result.leveledUp && <div className="flex items-center gap-1.5 font-bold text-gold"><ChevronUp size={18} /> Level up!</div>}
          </div>
          {result.newBadge && (
            <div className="mt-2 text-sm font-semibold text-gold">🤹 Badge unlocked: {result.newBadge.name}</div>
          )}
        </motion.div>
      )}
    </Page>
  )
}
