import Page from '../components/Page'
import PlayerCard from '../components/PlayerCard'
import SkillBar from '../components/SkillBar'
import { usePlayer, useSkills, useLogs, useStreak } from '../hooks/useData'
import { levelForXp } from '../lib/game'

function when(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Dashboard() {
  const player = usePlayer()
  const skills = useSkills()
  const logs = useLogs()
  const streak = useStreak()

  if (!player || !skills) {
    return (
      <Page title="My Stats" back>
        <p className="text-white/60">Create a player first.</p>
      </Page>
    )
  }

  const lvl = levelForXp(player.xp)
  const pct = Math.round((lvl.intoLevel / lvl.span) * 100)

  return (
    <Page title="My Stats" back>
      <PlayerCard player={player} skills={skills} />

      <div className="card mt-4 p-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Level {lvl.level}</span>
          <span className="text-white/60">{lvl.intoLevel}/{lvl.span} XP</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-pitch-light transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-center text-sm text-white/60">
          🔥 {streak?.currentStreak ?? 0} day streak · best {streak?.longestStreak ?? 0}
        </div>
      </div>

      <div className="card mt-4 space-y-3 p-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">Skill ratings</h2>
        {skills.map((s) => (
          <SkillBar key={s.key} skill={s.key} value={s.value} />
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-widest text-white/60">Recent sessions</h2>
      {logs && logs.length > 0 ? (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="card flex items-center justify-between p-3">
              <div>
                <div className="font-bold">{l.sessionName}</div>
                <div className="text-xs text-white/60">{when(l.date)}</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-pitch-light">+{l.xpEarned} XP</div>
                <div className="text-xs text-white/60">{l.drillResults.length} drills</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/60">No sessions yet — go train! ⚽</p>
      )}
    </Page>
  )
}
