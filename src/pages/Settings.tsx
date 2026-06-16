import { Link } from 'react-router-dom'
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
    ])
    location.href = '/'
  }

  return (
    <Page title="Settings" back>
      <div className="card divide-y divide-white/10">
        <Link to="/profile" className="flex items-center justify-between px-4 py-4">
          <span className="font-bold">Edit player</span>
          <span className="text-white/40">→</span>
        </Link>
        <Link to="/goals" className="flex items-center justify-between px-4 py-4">
          <span className="font-bold">Focus skills</span>
          <span className="text-white/40">→</span>
        </Link>
      </div>

      <div className="card mt-4 p-4 text-sm text-white/70">
        <p className="font-bold text-white">📲 Add to your iPad / iPhone</p>
        <p className="mt-1">In Safari, tap the <b>Share</b> button, then <b>Add to Home Screen</b>. Garden Baller will open full-screen and work even with no internet in the garden.</p>
      </div>

      <button onClick={resetProgress} className="btn mt-4 w-full bg-red-500/80 py-4 text-lg text-white">
        Reset all progress
      </button>

      <p className="mt-6 text-center text-xs text-white/40">Garden Baller · plays fully offline · your data stays on this device</p>
    </Page>
  )
}
