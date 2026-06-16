import { useParams } from 'react-router-dom'
import Page from '../components/Page'
import { DRILL_BY_ID } from '../data/drills'
import { useBests } from '../hooks/useData'
import { SKILL_LABELS, type SkillKey } from '../types'
import { isHigherBetter } from '../lib/game'

export default function DrillDetail() {
  const { id } = useParams()
  const drill = id ? DRILL_BY_ID[id] : undefined
  const bests = useBests()
  const best = bests?.find((b) => b.drillId === id)

  if (!drill) {
    return (
      <Page title="Drill" back>
        <p className="text-white/60">Drill not found.</p>
      </Page>
    )
  }

  const skills: SkillKey[] = [drill.primarySkill, ...drill.secondarySkills]

  return (
    <Page title={drill.name} back>
      <div className="card flex items-center gap-4 p-5">
        <span className="text-6xl">{drill.emoji}</span>
        <div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${i === 0 ? 'bg-pitch-light text-baller-ink' : 'bg-white/10'}`}>
                {SKILL_LABELS[s]}
              </span>
            ))}
          </div>
          <div className="mt-2 text-sm text-white/60">{drill.equipment.join(' · ')}</div>
        </div>
      </div>

      {best && (
        <div className="card mt-4 flex items-center justify-between p-4">
          <span className="font-bold">⭐ Your best</span>
          <span className="text-2xl font-extrabold tabular-nums">
            {best.bestScore}{isHigherBetter(drill.scoreType) ? '' : 's'}
          </span>
        </div>
      )}

      <ol className="card mt-4 space-y-3 p-5">
        {drill.instructions.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pitch-light font-bold text-baller-ink">{i + 1}</span>
            <span className="text-white/90">{step}</span>
          </li>
        ))}
      </ol>

      <div className="card mt-4 p-4 text-sm text-white/70">
        <span className="font-bold text-white">Gets harder by:</span> more reps, smaller targets and shorter time as you level up.
      </div>
    </Page>
  )
}
