import { BarChart3, Crosshair, Gauge, Goal, Ruler, ShieldCheck, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import type { VisionShotSummary } from '../../lib/vision/types'

interface Props {
  shots: VisionShotSummary[]
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function bestBy(shots: VisionShotSummary[], score: (shot: VisionShotSummary) => number | undefined): VisionShotSummary | undefined {
  return shots.reduce<VisionShotSummary | undefined>((best, shot) => {
    const value = score(shot)
    if (value === undefined) return best
    const bestValue = best ? score(best) : undefined
    return bestValue === undefined || value > bestValue ? shot : best
  }, undefined)
}

export default function VisionRawStatsPanel({ shots }: Props) {
  const goals = shots.filter((shot) => shot.outcome === 'goal')
  const attempts = shots.length
  const shotAccuracy = attempts > 0 ? goals.length / attempts : 0
  const highestPower = bestBy(shots, (shot) => shot.powerScore)
  const fastest = bestBy(shots, (shot) => shot.speedKmh ?? shot.speedPxPerSec)
  const furthestGoal = bestBy(goals, (shot) => shot.distanceMetres ?? shot.distancePixels)
  const mostAccurate = bestBy(shots, (shot) => shot.accuracyScore)
  const bestCurve = bestBy(shots, (shot) => shot.curveScore)
  const averageQuality = attempts > 0 ? Math.round(shots.reduce((sum, shot) => sum + shot.qualityScore, 0) / attempts) : 0
  const averageConfidence = attempts > 0 ? shots.reduce((sum, shot) => sum + shot.confidenceScore, 0) / attempts : 0

  return (
    <div className="card card-hi p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Raw stats</div>
          <h2 className="text-2xl font-extrabold">Shot lab numbers</h2>
        </div>
        <BarChart3 size={24} className="text-emerald-glow" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <RawStat icon={<Crosshair size={16} />} label="Shot accuracy" value={attempts ? pct(shotAccuracy) : '--'} detail={`${goals.length}/${attempts} goals`} />
        <RawStat icon={<Zap size={16} />} label="Highest power" value={highestPower ? `${highestPower.powerScore}/100` : '--'} detail={highestPower?.powerLabel ?? 'No shots'} />
        <RawStat
          icon={<Ruler size={16} />}
          label="Furthest goal"
          value={furthestGoal ? (furthestGoal.distanceMetres ? `${furthestGoal.distanceMetres}m` : `${furthestGoal.distancePixels}px`) : '--'}
          detail={furthestGoal?.accuracyLabel ?? 'No goals yet'}
        />
        <RawStat
          icon={<Gauge size={16} />}
          label="Fastest shot"
          value={fastest ? (fastest.speedKmh ? `${fastest.speedKmh} km/h` : `${fastest.peakSpeedPxPerSec} px/s`) : '--'}
          detail={fastest ? `peak ${fastest.peakSpeedPxPerSec} px/s` : 'No shots'}
        />
        <RawStat icon={<Goal size={16} />} label="Most accurate" value={mostAccurate ? `${mostAccurate.accuracyScore}/100` : '--'} detail={mostAccurate?.accuracyLabel ?? 'No shots'} />
        <RawStat icon={<ShieldCheck size={16} />} label="Avg confidence" value={attempts ? pct(averageConfidence) : '--'} detail={`Avg quality ${averageQuality || '--'}`} />
      </div>

      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-semibold text-white/58">
        Biggest curve estimate: {bestCurve ? `${bestCurve.curveScore}/100 · ${bestCurve.curveDirection}` : 'No shots yet'}
      </div>
    </div>
  )
}

function RawStat({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-1.5 text-white/42">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="num mt-1 text-2xl font-extrabold text-gold">{value}</div>
      <div className="truncate text-xs font-semibold text-white/42">{detail}</div>
    </div>
  )
}
