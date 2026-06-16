import { CalendarDays, Target, Zap, Footprints, Check, type LucideIcon } from 'lucide-react'
import Page from '../components/Page'
import { useLogs } from '../hooks/useData'
import { DRILL_BY_ID } from '../data/drills'
import { todayKey } from '../lib/game'

function weekStart(): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return todayKey(d)
}

const WEEK_PLAN: [string, string][] = [
  ['Mon', 'Shooting'],
  ['Tue', 'Dribbling'],
  ['Wed', 'Fence passing'],
  ['Thu', 'Weak foot'],
  ['Fri', 'Full 30'],
  ['Sat', 'Matchday'],
  ['Sun', 'Rest / Quick 10'],
]

export default function Missions() {
  const logs = useLogs(100)
  const start = weekStart()

  const thisWeek = (logs ?? []).filter((l) => l.day >= start)
  const days = new Set(thisWeek.map((l) => l.day)).size
  const goals = thisWeek.reduce(
    (sum, l) => sum + l.drillResults.filter((r) => DRILL_BY_ID[r.drillId]?.scoreType === 'goals').reduce((s, r) => s + r.score, 0),
    0,
  )
  const pbs = thisWeek.reduce((sum, l) => sum + l.drillResults.filter((r) => r.beatPB).length, 0)
  const weakFootDays = thisWeek.filter((l) => l.sessionId === 'weakFoot').length

  const missions: { Icon: LucideIcon; text: string; progress: number; target: number }[] = [
    { Icon: CalendarDays, text: 'Train 5 days this week', progress: days, target: 5 },
    { Icon: Target, text: 'Score 30 goals', progress: goals, target: 30 },
    { Icon: Zap, text: 'Beat 2 personal bests', progress: pbs, target: 2 },
    { Icon: Footprints, text: 'Do a Weak Foot Day', progress: weakFootDays, target: 1 },
  ]

  return (
    <Page title="Missions" kicker="This week" back>
      <div className="space-y-3">
        {missions.map((m) => {
          const done = m.progress >= m.target
          const pct = Math.min(100, Math.round((m.progress / m.target) * 100))
          return (
            <div key={m.text} className={`card card-hi p-4 ${done ? 'shadow-emerald' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${done ? 'bg-emerald-glow/20 text-emerald-glow' : 'bg-white/5 text-white/60'}`}>
                  {done ? <Check size={18} strokeWidth={3} /> : <m.Icon size={18} />}
                </span>
                <span className="flex-1 font-semibold">{m.text}</span>
                <span className="num text-sm font-bold text-white/60">{done ? 'Done' : `${m.progress}/${m.target}`}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-glow transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <h2 className="mb-2 mt-8 label">This week's plan</h2>
      <div className="card divide-y divide-white/10">
        {WEEK_PLAN.map(([day, label]) => (
          <div key={day} className="flex items-center justify-between px-4 py-3">
            <span className="num font-bold uppercase text-white/60">{day}</span>
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>
    </Page>
  )
}
