import Page from '../components/Page'
import { useLogs } from '../hooks/useData'
import { DRILL_BY_ID } from '../data/drills'
import { todayKey } from '../lib/game'

// Monday of the current week as YYYY-MM-DD.
function weekStart(): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - day)
  return todayKey(d)
}

const WEEK_PLAN = [
  ['Mon', '🎯 Shooting'],
  ['Tue', '🌀 Dribbling'],
  ['Wed', '🧱 Fence passing'],
  ['Thu', '🦶 Weak foot'],
  ['Fri', '🏆 Full 30'],
  ['Sat', '⚽ Matchday'],
  ['Sun', '😴 Rest / Quick 10'],
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

  const missions = [
    { emoji: '📅', text: 'Train 5 days this week', progress: days, target: 5 },
    { emoji: '🎯', text: 'Score 30 goals', progress: goals, target: 30 },
    { emoji: '💥', text: 'Beat 2 personal bests', progress: pbs, target: 2 },
    { emoji: '🦶', text: 'Do a Weak Foot Day', progress: weakFootDays, target: 1 },
  ]

  return (
    <Page title="Weekly Missions" back>
      <div className="space-y-3">
        {missions.map((m) => {
          const done = m.progress >= m.target
          const pct = Math.min(100, Math.round((m.progress / m.target) * 100))
          return (
            <div key={m.text} className={`card p-4 ${done ? 'ring-2 ring-pitch-light' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold">{m.emoji} {m.text}</span>
                <span className="text-sm font-bold tabular-nums">{done ? '✅' : `${m.progress}/${m.target}`}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-pitch-light transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <h2 className="mb-2 mt-8 text-sm font-bold uppercase tracking-widest text-white/60">This week's plan</h2>
      <div className="card divide-y divide-white/10">
        {WEEK_PLAN.map(([day, label]) => (
          <div key={day} className="flex items-center justify-between px-4 py-3">
            <span className="font-bold text-white/70">{day}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </Page>
  )
}
