import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Pause, Check, Plus, Minus, Camera } from 'lucide-react'
import ProgressRing from '../components/ProgressRing'
import GardenPitch from '../components/GardenPitch'
import { GARDEN_LAYOUTS } from '../data/gardenLayouts'
import { DrillIcon } from '../components/icons'
import { SESSION_BY_ID } from '../data/sessions'
import { DRILL_BY_ID } from '../data/drills'
import { useCustomSessions } from '../hooks/useData'
import { completeSession, type RunDrill } from '../lib/complete'
import { useRunStore } from '../store/run'
import { isHigherBetter } from '../lib/game'
import { whistle, beep, longWhistle, pop } from '../lib/sound'
import type { Session } from '../types'

type Phase = 'intro' | 'timer' | 'score'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function SessionRunner() {
  const { id } = useParams()
  const nav = useNavigate()
  const custom = useCustomSessions()
  const setSummary = useRunStore((s) => s.setSummary)

  const session: Session | undefined = useMemo(() => {
    if (!id) return undefined
    return SESSION_BY_ID[id] ?? custom?.find((s) => s.id === id)
  }, [id, custom])

  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('intro')
  const [remaining, setRemaining] = useState(0)
  const [paused, setPaused] = useState(false)
  const [score, setScore] = useState(0)
  const scoresRef = useRef<number[]>([])
  const tick = useRef<ReturnType<typeof setInterval>>()

  const current = session?.drillRefs[index]
  const drill = current ? DRILL_BY_ID[current.drillId] : undefined

  useEffect(() => {
    if (phase !== 'timer' || paused) return
    tick.current = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1
        if (next <= 0) {
          clearInterval(tick.current)
          longWhistle()
          setPhase('score')
          return 0
        }
        if (next <= 3) beep()
        return next
      })
    }, 1000)
    return () => clearInterval(tick.current)
  }, [phase, paused])

  if (!session || !current || !drill) {
    return (
      <div className="safe-top grid h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-white/60">That session could not be found.</p>
          <button onClick={() => nav('/today')} className="btn-primary mt-4 px-6 py-3">Back to sessions</button>
        </div>
      </div>
    )
  }

  const total = session.drillRefs.length
  const higherBetter = isHigherBetter(drill.scoreType)

  function startDrill() {
    setRemaining(current!.durationSec)
    setPaused(false)
    setPhase('timer')
    whistle()
  }

  function quit() {
    if (confirm('Stop this session? Progress for it will not be saved.')) nav('/today')
  }

  async function submitScore() {
    scoresRef.current[index] = score
    if (index < total - 1) {
      setIndex((i) => i + 1)
      setScore(0)
      setPhase('intro')
      return
    }
    const runDrills: RunDrill[] = session!.drillRefs.map((d, i) => ({
      drillId: d.drillId,
      score: scoresRef.current[i] ?? 0,
      target: d.target,
      tier: d.tier,
    }))
    const summary = await completeSession(session!.id, session!.name, runDrills)
    setSummary(summary)
    nav('/done')
  }

  return (
    <div className="safe-top flex min-h-screen flex-col px-5">
      <div className="flex items-center gap-3 py-3">
        <button onClick={quit} className="btn-ghost h-9 w-9" aria-label="Quit"><X size={18} /></button>
        <div className="flex flex-1 gap-1.5">
          {session.drillRefs.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-emerald-glow' : i === index ? 'bg-white/60' : 'bg-white/15'}`} />
          ))}
        </div>
        <span className="num text-sm font-bold">{index + 1}/{total}</span>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center">
              {GARDEN_LAYOUTS[drill.id] ? (
                <div className="card card-hi mx-auto overflow-hidden p-2">
                  <GardenPitch layout={GARDEN_LAYOUTS[drill.id]} className="block h-44 w-auto" />
                </div>
              ) : (
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-emerald-glow/15 text-emerald-glow">
                  <DrillIcon drillId={drill.id} size={40} />
                </div>
              )}
              <h1 className="mt-4 text-center text-3xl font-extrabold">{drill.name}</h1>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {drill.equipment.map((e) => (
                  <span key={e} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">{e}</span>
                ))}
              </div>
              <ol className="card mt-5 space-y-3 p-5">
                {drill.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-glow font-bold text-base-900">{i + 1}</span>
                    <span className="text-white/85">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-center font-semibold text-white/65">
                Target: {higherBetter ? `get ${current.target}` : `beat ${current.target}s`} · {fmt(current.durationSec)} on the clock
              </p>
              {drill.primarySkill === 'shooting' && (
                <Link to={`/vision?drill=${drill.id}&session=${session.id}`} className="btn-ghost mt-4 w-full py-3 text-sm">
                  <Camera size={17} /> Open Vision Mode
                </Link>
              )}
            </div>
            <button onClick={startDrill} className="btn-emerald mb-6 w-full py-5 text-2xl font-extrabold uppercase">
              <Play size={24} fill="currentColor" /> Start drill
            </button>
          </motion.div>
        )}

        {phase === 'timer' && (
          <motion.div key="timer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-2xl font-extrabold"><DrillIcon drillId={drill.id} size={24} className="text-emerald-glow" /> {drill.name}</div>
            <ProgressRing
              fraction={remaining / current.durationSec}
              label={fmt(remaining)}
              sub={paused ? 'Paused' : higherBetter ? `Target: ${current.target}` : `Beat ${current.target}s`}
            />
            <div className="flex w-full gap-3">
              <button onClick={() => setPaused((p) => !p)} className="btn-ghost flex-1 py-4 text-lg">
                {paused ? <><Play size={20} /> Resume</> : <><Pause size={20} /> Pause</>}
              </button>
              <button onClick={() => { clearInterval(tick.current); longWhistle(); setPhase('score') }} className="btn-emerald flex-1 py-4 text-lg">
                <Check size={20} /> Done
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'score' && (
          <motion.div key="score" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center">
            <h1 className="text-center text-3xl font-extrabold">How did you do?</h1>
            <p className="mt-1 text-center text-white/60">{drill.name}</p>
            <p className="mt-1 text-center text-sm text-white/45">
              {higherBetter ? `Target was ${current.target}` : `Target was under ${current.target}s — enter your time`}
            </p>

            <div className="mt-8 flex items-center gap-6">
              <button onClick={() => { pop(); setScore((s) => Math.max(0, s - 1)) }} className="btn-ghost grid h-16 w-16 place-items-center"><Minus size={28} /></button>
              <div className="num w-28 text-center text-7xl font-extrabold text-gold">{score}</div>
              <button onClick={() => { pop(); setScore((s) => s + 1) }} className="btn-emerald grid h-16 w-16 place-items-center"><Plus size={28} /></button>
            </div>
            <div className="mt-2 text-sm text-white/45">{higherBetter ? (drill.scoreType === 'goals' ? 'goals scored' : 'reps / passes') : 'seconds'}</div>

            <button onClick={submitScore} className="btn-primary mt-10 w-full py-5 text-2xl font-extrabold uppercase">
              {index >= total - 1 ? 'Finish session' : 'Next drill'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
