import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import Page from '../components/Page'
import SkillDiagram from '../components/SkillDiagram'
import PitchDiagram from '../components/PitchDiagram'
import { SKILL_GUIDES } from '../data/howto'
import { TACTICS } from '../data/tactics'

const DIFF_COLOUR: Record<string, string> = {
  Starter: 'text-emerald-glow',
  Tricky: 'text-gold',
  Pro: 'text-fuchsia-400',
}

export default function Learn() {
  return (
    <Page title="Academy" kicker="Learn the game" back>
      <h2 className="mb-2 label">How to — skills & tricks</h2>
      <div className="space-y-3">
        {SKILL_GUIDES.map((s) => (
          <Link key={s.id} to={`/learn/skill/${s.id}`} className="card card-hi flex items-center gap-3 p-3 active:scale-[0.98]">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-base-700">
              <SkillDiagram spec={s.diagram} className="h-full w-full" />
            </div>
            <div className="flex-1">
              <div className="font-bold leading-tight">{s.name}</div>
              <div className={`text-xs font-semibold ${DIFF_COLOUR[s.difficulty]}`}>{s.difficulty}</div>
              <div className="text-xs text-white/50 line-clamp-1">{s.what}</div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-white/30" />
          </Link>
        ))}
      </div>

      <h2 className="mb-2 mt-7 label">Guide to football</h2>
      <div className="space-y-3">
        {TACTICS.map((t) => (
          <Link key={t.id} to={`/learn/tactic/${t.id}`} className="card card-hi flex items-center gap-3 p-3 active:scale-[0.98]">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg">
              <PitchDiagram spec={t.diagram} className="h-full w-full" />
            </div>
            <div className="flex-1">
              <div className="font-bold leading-tight">{t.name}</div>
              <div className="text-xs font-semibold text-emerald-glow">{t.group}</div>
              <div className="text-xs text-white/50 line-clamp-1">{t.tagline}</div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-white/30" />
          </Link>
        ))}
      </div>
    </Page>
  )
}
