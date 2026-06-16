import { Link } from 'react-router-dom'
import { User, Target, Share, ChevronRight, Trash2 } from 'lucide-react'
import Page from '../components/Page'
import { db } from '../db/db'

export default function Settings() {
  async function resetProgress() {
    if (!confirm('Reset ALL progress? This cannot be undone.')) return
    await Promise.all([
      db.player.clear(),
      db.skills.clear(),
      db.logs.clear(),
      db.bests.clear(),
      db.badges.clear(),
      db.meta.clear(),
      db.focusGoals.clear(),
      db.customSessions.clear(),
      db.garden.clear(),
    ])
    location.href = '/'
  }

  return (
    <Page title="Settings" back>
      <div className="card divide-y divide-white/10">
        <Link to="/profile" className="flex items-center gap-3 px-4 py-4">
          <User size={20} className="text-white/60" />
          <span className="flex-1 font-semibold">Edit player</span>
          <ChevronRight size={18} className="text-white/30" />
        </Link>
        <Link to="/goals" className="flex items-center gap-3 px-4 py-4">
          <Target size={20} className="text-white/60" />
          <span className="flex-1 font-semibold">Focus skills</span>
          <ChevronRight size={18} className="text-white/30" />
        </Link>
      </div>

      <div className="card mt-4 flex gap-3 p-4 text-sm text-white/70">
        <Share size={20} className="mt-0.5 shrink-0 text-emerald-glow" />
        <p>
          <span className="font-bold text-white">Add to iPad / iPhone:</span> in Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>. Garden Baller opens full-screen and works with no internet in the garden.
        </p>
      </div>

      <button onClick={resetProgress} className="btn mt-4 w-full border border-red-500/40 bg-red-500/15 py-4 text-lg text-red-300">
        <Trash2 size={18} /> Reset all progress
      </button>

      <p className="mt-6 text-center text-xs text-white/35">Garden Baller · plays fully offline · data stays on this device</p>
    </Page>
  )
}
