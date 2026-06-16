import { useParams } from 'react-router-dom'
import { Footprints, Lightbulb } from 'lucide-react'
import Page from '../components/Page'
import SkillDiagram from '../components/SkillDiagram'
import { SKILL_BY_ID } from '../data/howto'

const DIFF_COLOUR: Record<string, string> = {
  Starter: 'bg-emerald-glow/15 text-emerald-glow',
  Tricky: 'bg-gold/15 text-gold',
  Pro: 'bg-fuchsia-400/15 text-fuchsia-300',
}

export default function SkillGuide() {
  const { id } = useParams()
  const skill = id ? SKILL_BY_ID[id] : undefined

  if (!skill) {
    return <Page title="Skill" back><p className="text-white/55">Not found.</p></Page>
  }

  return (
    <Page title={skill.name} kicker="How to" back>
      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${DIFF_COLOUR[skill.difficulty]}`}>
        {skill.difficulty}
      </span>
      <p className="mt-3 text-white/75">{skill.what}</p>

      <div className="card card-hi mt-4 overflow-hidden bg-base-700 p-3">
        <SkillDiagram spec={skill.diagram} className="mx-auto block h-44 w-full" />
        <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-white/70">
          <Footprints size={16} className="text-emerald-glow" /> {skill.diagram.footPart}
        </div>
      </div>

      <ol className="card mt-4 space-y-3 p-5">
        {skill.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-glow font-bold text-base-900">{i + 1}</span>
            <span className="text-white/85">{step}</span>
          </li>
        ))}
      </ol>

      <div className="card mt-4 flex gap-3 p-4">
        <Lightbulb size={20} className="mt-0.5 shrink-0 text-gold" />
        <p className="text-sm text-white/80"><span className="font-bold text-white">Coach's tip:</span> {skill.tip}</p>
      </div>
    </Page>
  )
}
