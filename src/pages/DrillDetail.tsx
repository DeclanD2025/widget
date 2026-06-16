import { useParams, Link } from 'react-router-dom'
import { Star, MapPin } from 'lucide-react'
import Page from '../components/Page'
import { DRILL_BY_ID } from '../data/drills'
import { DrillIcon } from '../components/icons'
import { useBests } from '../hooks/useData'
import { SKILL_LABELS, type SkillKey } from '../types'
import { isHigherBetter } from '../lib/game'
import { GARDEN_LAYOUTS } from '../data/gardenLayouts'

export default function DrillDetail() {
  const { id } = useParams()
  const drill = id ? DRILL_BY_ID[id] : undefined
  const bests = useBests()
  const best = bests?.find((b) => b.drillId === id)

  if (!drill) {
    return <Page title="Drill" back><p className="text-white/55">Drill not found.</p></Page>
  }

  const skills: SkillKey[] = [drill.primarySkill, ...drill.secondarySkills]
  const hasLayout = !!GARDEN_LAYOUTS[drill.id]

  return (
    <Page title={drill.name} back>
      <div className="card card-hi flex items-center gap-4 p-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-glow/15 text-emerald-glow">
          <DrillIcon drillId={drill.id} size={32} />
        </span>
        <div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${i === 0 ? 'bg-emerald-glow text-base-900' : 'border border-white/10 bg-white/5 text-white/70'}`}>
                {SKILL_LABELS[s]}
              </span>
            ))}
          </div>
          <div className="mt-2 text-sm text-white/55">{drill.equipment.join(' · ')}</div>
        </div>
      </div>

      {best && (
        <div className="card mt-4 flex items-center justify-between p-4">
          <span className="flex items-center gap-2 font-bold"><Star size={18} className="text-gold" fill="currentColor" /> Your best</span>
          <span className="num text-2xl font-extrabold text-gold">{best.bestScore}{isHigherBetter(drill.scoreType) ? '' : 's'}</span>
        </div>
      )}

      {hasLayout && (
        <Link to={`/garden?drill=${drill.id}`} className="btn-ghost mt-4 w-full py-4 text-lg">
          <MapPin size={18} /> See it on my garden
        </Link>
      )}

      <ol className="card mt-4 space-y-3 p-5">
        {drill.instructions.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-glow font-bold text-base-900">{i + 1}</span>
            <span className="text-white/85">{step}</span>
          </li>
        ))}
      </ol>

      <div className="card mt-4 p-4 text-sm text-white/65">
        <span className="font-bold text-white">Gets harder by:</span> more reps, smaller targets and shorter time as you level up.
      </div>
    </Page>
  )
}
