import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Page from '../components/Page'
import GardenPitch from '../components/GardenPitch'
import { DrillIcon } from '../components/icons'
import { GARDEN_LAYOUTS } from '../data/gardenLayouts'
import { DRILL_BY_ID } from '../data/drills'

const LAYOUT_DRILLS = Object.keys(GARDEN_LAYOUTS)

export default function Garden() {
  const [params] = useSearchParams()
  const initial = params.get('drill')
  // '' = plain garden overview; otherwise overlay the chosen drill.
  const [drillId, setDrillId] = useState(initial && GARDEN_LAYOUTS[initial] ? initial : '')

  const layout = drillId ? GARDEN_LAYOUTS[drillId] : undefined
  const drill = drillId ? DRILL_BY_ID[drillId] : undefined

  return (
    <Page title="My Garden" kicker="Bird's-eye pitch" back>
      <div className="card card-hi overflow-hidden p-3">
        <GardenPitch layout={layout} className="mx-auto block h-[58vh] w-auto" />
      </div>

      {layout && (
        <div className="card mt-3 flex items-start gap-3 p-3 text-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-glow/15 text-emerald-glow">
            <DrillIcon drillId={drillId} size={18} />
          </span>
          <div>
            <div className="font-bold">{drill?.name}</div>
            <div className="text-white/60">{layout.tip}</div>
          </div>
        </div>
      )}

      <h2 className="mb-2 mt-4 label">Show a drill on the pitch</h2>
      <div className="flex flex-wrap gap-2 pb-2">
        <button
          onClick={() => setDrillId('')}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            drillId === '' ? 'border-emerald-glow bg-emerald-glow/15 text-emerald-glow' : 'border-white/10 bg-white/5 text-white/70'
          }`}
        >
          Garden only
        </button>
        {LAYOUT_DRILLS.map((id) => (
          <button
            key={id}
            onClick={() => setDrillId(id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              id === drillId ? 'border-emerald-glow bg-emerald-glow/15 text-emerald-glow' : 'border-white/10 bg-white/5 text-white/70'
            }`}
          >
            <DrillIcon drillId={id} size={15} /> {DRILL_BY_ID[id]?.name}
          </button>
        ))}
      </div>

      <p className="mt-2 text-center text-xs text-white/35">
        A top-down map of Caiden's real garden. Pick a drill to see where to set up.
      </p>
    </Page>
  )
}
