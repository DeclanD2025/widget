import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../components/Page'
import Crest from '../components/Crest'
import { db } from '../db/db'
import { usePlayer } from '../hooks/useData'

const COLOURS = ['#1fd17a', '#f4c95d', '#ef4444', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899', '#f97316']

export default function Profile() {
  const nav = useNavigate()
  const player = usePlayer()

  const [name, setName] = useState('Caiden')
  const [age, setAge] = useState(10)
  const [foot, setFoot] = useState<'L' | 'R'>('R')
  const [colour, setColour] = useState(COLOURS[0])

  useEffect(() => {
    if (player) {
      setName(player.name)
      setAge(player.age)
      setFoot(player.strongFoot)
      setColour(player.colour)
    }
  }, [player])

  async function save() {
    await db.player.put({
      id: 'me',
      name: name.trim() || 'Caiden',
      age,
      strongFoot: foot,
      colour,
      avatar: '',
      level: player?.level ?? 1,
      xp: player?.xp ?? 0,
      createdAt: player?.createdAt ?? new Date().toISOString(),
    })
    nav('/dashboard')
  }

  return (
    <Page title="Player" kicker="Edit profile" back>
      <div className="card card-hi flex flex-col items-center gap-3 p-5">
        <Crest name={name} colour={colour} size={96} />
        <div className="num text-2xl font-extrabold uppercase">{name || 'Caiden'}</div>
      </div>

      <div className="card mt-4 p-5">
        <label className="label">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-lg outline-none focus:border-emerald-glow"
        />

        <label className="mt-4 block label">Age — {age}</label>
        <input type="range" min={6} max={16} value={age} onChange={(e) => setAge(+e.target.value)} className="w-full accent-emerald-glow" />

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
              className={`h-10 w-10 rounded-full transition active:scale-90 ${colour === c ? 'ring-2 ring-white ring-offset-2 ring-offset-base-900' : ''}`}
            />
          ))}
        </div>
      </div>

      <button onClick={save} className="btn-primary mt-4 w-full py-4 text-xl font-extrabold uppercase">Save</button>
    </Page>
  )
}
