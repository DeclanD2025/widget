import { Clock, Goal, Gauge, Trophy } from 'lucide-react'
import type { VisionShotSummary } from '../../lib/vision/types'

interface Props {
  shots: VisionShotSummary[]
}

export default function VisionShotHistory({ shots }: Props) {
  return (
    <div className="card card-hi p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Best-shot history</div>
          <h2 className="text-2xl font-extrabold">Recent strikes</h2>
        </div>
        <Trophy size={24} className="text-gold" />
      </div>

      <div className="mt-3 space-y-2">
        {shots.length === 0 && <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-semibold text-white/45">No shots saved yet.</div>}
        {shots.slice(0, 8).map((shot) => (
          <div key={shot.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${shot.outcome === 'goal' ? 'bg-emerald-glow/15 text-emerald-glow' : 'bg-white/5 text-white/55'}`}>
              {shot.outcome === 'goal' ? <Goal size={18} /> : <Gauge size={18} />}
            </div>
            <div>
              <div className="font-extrabold">{shot.outcome === 'goal' ? 'Goal' : shot.outcome.replace(/-/g, ' ')}</div>
              <div className="flex items-center gap-1 text-xs text-white/42">
                <Clock size={12} /> {new Date(shot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="text-right">
              <div className="num text-2xl font-extrabold text-gold">{shot.qualityScore}</div>
              <div className="text-[10px] font-bold uppercase text-white/35">{shot.speedKmh ? `${shot.speedKmh} km/h` : `${shot.speedPxPerSec} px/s`}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
