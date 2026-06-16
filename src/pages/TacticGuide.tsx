import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import Page from '../components/Page'
import PitchDiagram from '../components/PitchDiagram'
import { TACTIC_BY_ID } from '../data/tactics'

export default function TacticGuide() {
  const { id } = useParams()
  const tactic = id ? TACTIC_BY_ID[id] : undefined

  if (!tactic) {
    return <Page title="Guide" back><p className="text-white/55">Not found.</p></Page>
  }

  return (
    <Page title={tactic.name} kicker={tactic.group} back>
      <p className="text-sm font-semibold text-emerald-glow">{tactic.tagline}</p>
      <p className="mt-2 text-white/75">{tactic.what}</p>

      <div className="card card-hi mt-4 overflow-hidden p-2">
        <PitchDiagram spec={tactic.diagram} className="block w-full" />
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-emerald-glow" /> Our team</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-white" /> Opponent</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white bg-white" /> Ball</span>
      </div>

      <div className="card mt-4 space-y-3 p-5">
        {tactic.points.map((p, i) => (
          <div key={i} className="flex gap-3">
            <Check size={18} className="mt-0.5 shrink-0 text-emerald-glow" strokeWidth={3} />
            <span className="text-white/85">{p}</span>
          </div>
        ))}
      </div>
    </Page>
  )
}
