import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../components/Page'
import { DRILLS } from '../data/drills'
import { db } from '../db/db'
import { usePlayer } from '../hooks/useData'
import { tierTarget, levelForXp } from '../lib/game'
import type { Session } from '../types'

export default function CustomBuilder() {
  const nav = useNavigate()
  const player = usePlayer()
  const level = player ? levelForXp(player.xp).level : 1

  const [name, setName] = useState('My Session')
  const [tier, setTier] = useState(1)
  const [picked, setPicked] = useState<string[]>([])

  const available = DRILLS.filter((d) => d.unlockLevel <= level)

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  async function save() {
    if (picked.length === 0) return
    const session: Session = {
      id: `custom-${Date.now()}`,
      name: name.trim() || 'My Session',
      mode: 'custom',
      emoji: '🛠️',
      blurb: 'Your own custom session.',
      isCustom: true,
      drillRefs: picked.map((id) => {
        const drill = DRILLS.find((d) => d.id === id)!
        return { drillId: id, tier, target: tierTarget(drill, tier), durationSec: drill.durationSec }
      }),
    }
    await db.customSessions.put(session)
    nav(`/session/${session.id}`)
  }

  return (
    <Page title="Build a Session" back>
      <div className="card p-4">
        <label className="text-sm font-semibold text-white/70">Session name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl bg-black/30 px-4 py-3 text-lg outline-none ring-pitch-light focus:ring-2"
        />
        <label className="mt-3 block text-sm font-semibold text-white/70">Difficulty: Tier {tier}</label>
        <input type="range" min={1} max={5} value={tier} onChange={(e) => setTier(+e.target.value)} className="w-full accent-pitch-light" />
      </div>

      <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-widest text-white/60">
        Pick drills ({picked.length})
      </h2>
      <div className="space-y-2">
        {available.map((d) => {
          const on = picked.includes(d.id)
          return (
            <button
              key={d.id}
              onClick={() => toggle(d.id)}
              className={`card flex w-full items-center gap-3 p-3 text-left transition active:scale-95 ${on ? 'ring-2 ring-pitch-light bg-pitch-light/10' : ''}`}
            >
              <span className="text-3xl">{d.emoji}</span>
              <span className="flex-1 font-bold">{d.name}</span>
              <span className="text-2xl">{on ? '✅' : '＋'}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={save}
        disabled={picked.length === 0}
        className="btn-primary mt-4 w-full py-5 text-xl disabled:opacity-40"
      >
        Save & start ▶︎
      </button>
    </Page>
  )
}
