import { Check } from 'lucide-react'
import Page from '../components/Page'
import { db } from '../db/db'
import { useFocusGoals } from '../hooks/useData'
import { SKILL_LABELS, type SkillKey } from '../types'
import { SkillIcon } from '../components/icons'

export default function Goals() {
  const goals = useFocusGoals()

  async function toggle(skillKey: string, selected: boolean) {
    await db.focusGoals.update(skillKey, { selected: !selected })
  }

  return (
    <Page title="Focus" kicker="What to improve" back>
      <p className="mb-3 text-white/55">Pick the skills Caiden most wants to sharpen. Sessions get tuned to match.</p>
      <div className="grid grid-cols-2 gap-3">
        {(goals ?? []).map((g) => (
          <button
            key={g.skillKey}
            onClick={() => toggle(g.skillKey, g.selected)}
            className={`card card-hi relative flex flex-col items-center gap-2 p-5 transition active:scale-[0.97] ${
              g.selected ? 'shadow-emerald' : ''
            }`}
          >
            {g.selected && (
              <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-emerald-glow text-base-900">
                <Check size={15} strokeWidth={3} />
              </span>
            )}
            <SkillIcon skill={g.skillKey as SkillKey} size={30} className={g.selected ? 'text-emerald-glow' : 'text-white/70'} />
            <span className="font-bold">{SKILL_LABELS[g.skillKey as SkillKey]}</span>
          </button>
        ))}
      </div>
    </Page>
  )
}
