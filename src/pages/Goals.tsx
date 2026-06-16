import Page from '../components/Page'
import { db } from '../db/db'
import { useFocusGoals } from '../hooks/useData'
import { SKILL_LABELS } from '../types'

const EMOJI: Record<string, string> = {
  shooting: '🎯',
  passing: '🧱',
  dribbling: '🌀',
  fitness: '💨',
  weakFoot: '🦶',
  control: '🎈',
}

export default function Goals() {
  const goals = useFocusGoals()

  async function toggle(skillKey: string, selected: boolean) {
    await db.focusGoals.update(skillKey, { selected: !selected })
  }

  return (
    <Page title="What to improve" back>
      <p className="mb-3 text-white/60">Tap the skills you most want to get better at. We'll suggest sessions to match.</p>
      <div className="grid grid-cols-2 gap-3">
        {(goals ?? []).map((g) => (
          <button
            key={g.skillKey}
            onClick={() => toggle(g.skillKey, g.selected)}
            className={`card flex flex-col items-center gap-2 p-5 transition active:scale-95 ${
              g.selected ? 'ring-2 ring-pitch-light bg-pitch-light/15' : ''
            }`}
          >
            <span className="text-4xl">{EMOJI[g.skillKey]}</span>
            <span className="font-bold">{SKILL_LABELS[g.skillKey]}</span>
            {g.selected && <span className="text-xs font-bold text-pitch-light">★ Focus</span>}
          </button>
        ))}
      </div>
    </Page>
  )
}
