import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Page from '../components/Page'
import { db } from '../db/db'
import { usePlayer } from '../hooks/useData'
import { levelForXp } from '../lib/game'

const AVATARS = ['⚽', '🦁', '🐯', '🦊', '🐉', '🦅', '🚀', '👟', '🧤', '🥇']
const COLOURS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#0ea5e9']

export default function Profile() {
  const nav = useNavigate()
  const player = usePlayer()
  const isNew = player === null

  const [name, setName] = useState('')
  const [age, setAge] = useState(10)
  const [foot, setFoot] = useState<'L' | 'R'>('R')
  const [colour, setColour] = useState(COLOURS[2])
  const [avatar, setAvatar] = useState(AVATARS[0])

  useEffect(() => {
    if (player) {
      setName(player.name)
      setAge(player.age)
      setFoot(player.strongFoot)
      setColour(player.colour)
      setAvatar(player.avatar)
    }
  }, [player])

  async function save() {
    await db.player.put({
      id: 'me',
      name: name.trim() || 'Baller',
      age,
      strongFoot: foot,
      colour,
      avatar,
      level: player?.level ?? 1,
      xp: player?.xp ?? 0,
      createdAt: player?.createdAt ?? new Date().toISOString(),
    })
    nav('/')
  }

  return (
    <Page title={isNew ? 'New Player' : 'Edit Player'} back={!isNew}>
      <div className="card p-5">
        <label className="text-sm font-semibold text-white/70">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Leo"
          className="mt-1 w-full rounded-xl bg-black/30 px-4 py-3 text-lg outline-none ring-pitch-light focus:ring-2"
        />

        <label className="mt-4 block text-sm font-semibold text-white/70">Age: {age}</label>
        <input type="range" min={6} max={16} value={age} onChange={(e) => setAge(+e.target.value)} className="w-full accent-pitch-light" />

        <label className="mt-4 block text-sm font-semibold text-white/70">Strong foot</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(['L', 'R'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFoot(f)}
              className={`btn py-3 ${foot === f ? 'btn-primary' : 'btn-ghost'}`}
            >
              {f === 'L' ? '🦶 Left' : 'Right 🦶'}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-semibold text-white/70">Pick your badge</label>
        <div className="mt-1 grid grid-cols-5 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`grid aspect-square place-items-center rounded-2xl text-3xl transition active:scale-90 ${
                avatar === a ? 'bg-white/20 ring-2 ring-pitch-light' : 'bg-white/5'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-semibold text-white/70">Club colour</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {COLOURS.map((c) => (
            <button
              key={c}
              onClick={() => setColour(c)}
              style={{ backgroundColor: c }}
              className={`h-10 w-10 rounded-full transition active:scale-90 ${
                colour === c ? 'ring-2 ring-white ring-offset-2 ring-offset-pitch-dark' : ''
              }`}
            />
          ))}
        </div>
      </div>

      <button onClick={save} className="btn-primary mt-4 w-full py-4 text-xl">
        {isNew ? "Let's go! ⚡" : 'Save'}
      </button>

      {!isNew && player && (
        <p className="mt-3 text-center text-sm text-white/50">
          Level {levelForXp(player.xp).level} · {player.xp} XP earned
        </p>
      )}
    </Page>
  )
}
