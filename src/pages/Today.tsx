import { Link } from 'react-router-dom'
import { Camera, Wrench, Star } from 'lucide-react'
import Page from '../components/Page'
import SessionCard from '../components/SessionCard'
import { SESSIONS, SESSION_BY_ID } from '../data/sessions'

function recommendedId(): string {
  const day = new Date().getDay()
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
    <Page title="Today" kicker="Your session" back>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gold">
          <Star size={15} fill="currentColor" /> Recommended for today
        </span>
        <Link to="/goals" className="text-sm font-semibold text-emerald-glow">Set focus →</Link>
      </div>
      <SessionCard session={rec} featured />

      <Link to="/vision" className="card card-hi mt-3 flex items-center gap-3 p-4 active:scale-[0.98]">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-glow/15 text-emerald-glow">
          <Camera size={21} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">Open Garden Baller Vision</span>
          <span className="block text-sm text-white/45">Camera overlay for shooting practice</span>
        </span>
      </Link>

      <h2 className="mb-2 mt-6 label">More sessions</h2>
      <div className="space-y-3">
        {others.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </div>

      <Link to="/custom" className="btn-ghost mt-4 w-full py-4 text-lg">
        <Wrench size={18} /> Build your own session
      </Link>
    </Page>
  )
}
