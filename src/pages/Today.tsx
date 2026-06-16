import { Link } from 'react-router-dom'
import Page from '../components/Page'
import SessionCard from '../components/SessionCard'
import { SESSIONS, SESSION_BY_ID } from '../data/sessions'

// Pick a sensible session for the day of the week (Thu = weak foot, Sat = matchday…).
function recommendedId(): string {
  const day = new Date().getDay() // 0 Sun … 6 Sat
  const byDay: Record<number, string> = {
    0: 'quick10',
    1: 'shooting',
    2: 'dribbling',
    3: 'fence',
    4: 'weakFoot',
    5: 'full30',
    6: 'matchday',
  }
  return byDay[day] ?? 'quick10'
}

export default function Today() {
  const recId = recommendedId()
  const rec = SESSION_BY_ID[recId]
  const others = SESSIONS.filter((s) => s.id !== recId)

  return (
    <Page title="Today" back>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-white/60">⭐ Recommended for today</span>
        <Link to="/goals" className="text-sm font-semibold text-pitch-light">Set focus →</Link>
      </div>
      <div className="ring-2 ring-pitch-light/50 rounded-3xl">
        <SessionCard session={rec} />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold text-white/60">More sessions</h2>
      <div className="space-y-3">
        {others.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </div>

      <Link to="/custom" className="btn-ghost mt-4 flex w-full items-center justify-center gap-2 py-4 text-lg">
        🛠️ Build your own session
      </Link>
    </Page>
  )
}
