import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Dumbbell,
  BarChart3,
  MapPin,
  GraduationCap,
  Trophy,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import Crest from './Crest'
import { db } from '../db/db'
import { usePlayer } from '../hooks/useData'
import { whistle } from '../lib/sound'

interface Slide {
  Icon: LucideIcon
  title: string
  body: string
}

const SLIDES: Slide[] = [
  { Icon: Play, title: 'Welcome to Garden Baller', body: "Hi Caiden! Turn your garden into your own training ground. Do quick, fun drills and level up like a real pro. ⚽" },
  { Icon: Dumbbell, title: 'Train every day', body: "Tap TRAIN NOW for today's session. Each drill tells you what to do, with a big timer counting you down — listen for the whistle!" },
  { Icon: BarChart3, title: 'Score & level up', body: 'After each drill, tap in your score. You earn XP, climb levels, and watch your six skill ratings rise on your player card.' },
  { Icon: MapPin, title: 'Your real garden', body: 'The bird\'s-eye map shows exactly where to put your cones and goals — just copy the picture and go!' },
  { Icon: Trophy, title: 'Challenges & badges', body: 'Beat the weekly keepy-up challenge, smash your missions, keep your streak alive and collect badges.' },
  { Icon: GraduationCap, title: 'The Academy', body: 'Learn cool skills like the knuckleball and trivela, and find out how real football tactics work — with animated diagrams.' },
]

const COLOURS = ['#1fd17a', '#f4c95d', '#ef4444', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899', '#f97316']

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const player = usePlayer()
  const [step, setStep] = useState(0)
  const total = SLIDES.length + 1 // + setup step
  const isSetup = step === SLIDES.length

  const [name, setName] = useState('Caiden')
  const [foot, setFoot] = useState<'L' | 'R'>('R')
  const [colour, setColour] = useState(COLOURS[0])

  // Prefill from the seeded player once.
  if (player && name === 'Caiden' && step === 0 && player.name && player.name !== 'Caiden') {
    setName(player.name)
  }

  async function finish() {
    if (player) {
      await db.player.put({ ...player, name: name.trim() || 'Caiden', strongFoot: foot, colour })
    }
    try {
      localStorage.setItem('gb-onboarded', '1')
    } catch {
      /* ignore */
    }
    whistle()
    onDone()
  }

  function next() {
    if (step < total - 1) setStep((s) => s + 1)
    else finish()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-base-900 safe-top">
      {/* Skip */}
      <div className="flex justify-end px-4 pt-2">
        {!isSetup && (
          <button onClick={() => setStep(SLIDES.length)} className="text-sm font-semibold text-white/45">Skip</button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-6">
        <AnimatePresence mode="wait">
          {!isSetup ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ scale: 0.6, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="grid h-28 w-28 place-items-center rounded-3xl bg-emerald-glow/15 text-emerald-glow shadow-emerald"
              >
                {(() => {
                  const Icon = SLIDES[step].Icon
                  return <Icon size={56} />
                })()}
              </motion.div>
              <h1 className="mt-6 text-3xl font-extrabold">{SLIDES[step].title}</h1>
              <p className="mt-3 max-w-xs text-lg text-white/70">{SLIDES[step].body}</p>
            </motion.div>
          ) : (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-1 flex-col items-center justify-center"
            >
              <Crest name={name} colour={colour} size={88} />
              <h1 className="mt-4 text-3xl font-extrabold">Make it yours</h1>
              <p className="mt-1 text-white/60">Set up your player card.</p>

              <div className="mt-5 w-full max-w-xs">
                <label className="label">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-lg outline-none focus:border-emerald-glow"
                />

                <label className="mt-4 block label">Strong foot</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(['L', 'R'] as const).map((f) => (
                    <button key={f} onClick={() => setFoot(f)} className={`py-3 ${foot === f ? 'btn-emerald' : 'btn-ghost'}`}>
                      {f === 'L' ? 'Left' : 'Right'}
                    </button>
                  ))}
                </div>

                <label className="mt-4 block label">Club colour</label>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  {COLOURS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColour(c)}
                      style={{ backgroundColor: c }}
                      className={`h-9 w-9 rounded-full transition active:scale-90 ${colour === c ? 'ring-2 ring-white ring-offset-2 ring-offset-base-900' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress dots */}
        <div className="mb-4 flex justify-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-emerald-glow' : 'w-2 bg-white/20'}`} />
          ))}
        </div>

        <button onClick={next} className="btn-emerald mb-8 w-full py-5 text-2xl font-extrabold uppercase">
          {isSetup ? <><Play size={24} fill="currentColor" /> Start training</> : <>Next <ChevronRight size={24} /></>}
        </button>
      </div>
    </div>
  )
}
