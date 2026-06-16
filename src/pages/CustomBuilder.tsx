import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Play } from 'lucide-react'
import Page from '../components/Page'
import { DRILLS } from '../data/drills'
import { DrillIcon } from '../components/icons'
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
      emoji: '',
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
    <Page title="Build a Session" kicker="Custom" back>
      <div className="card p-4">
        <label className="label">Session name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-lg outline-none focus:border-emerald-glow"
        />
        <label className="mt-3 block label">Difficulty — Tier {tier}</label>
        <input type="range" min={1} max={5} value={tier} onChange={(e) => setTier(+e.target.value)} className="w-full accent-emerald-glow" />
      </div>

      <h2 className="mb-2 mt-5 label">Pick drills ({picked.length})</h2>
      <div className="space-y-2">
        {available.map((d) => {
          const on = picked.includes(d.id)
          return (
            <button key={d.id} onClick={() => toggle(d.id)} className={`card flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.97] ${on ? 'shadow-emerald' : ''}`}>
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${on ? 'bg-emerald-glow/20 text-emerald-glow' : 'bg-white/5 text-white/60'}`}>
                <DrillIcon drillId={d.id} size={20} />
              </span>
              <span className="flex-1 font-semibold">{d.name}</span>
              {on ? <Check size={22} className="text-emerald-glow" strokeWidth={3} /> : <Plus size={22} className="text-white/40" />}
            </button>
          )
        })}
      </div>

      <button onClick={save} disabled={picked.length === 0} className="btn-primary mt-4 w-full py-5 text-xl font-extrabold uppercase disabled:opacity-40">
        <Play size={22} fill="currentColor" /> Save & start
      </button>
    </Page>
  )
}
