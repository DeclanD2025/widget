import { Award, BadgeCheck, CircleAlert, Crosshair, Gauge, Goal, Target, Zap } from 'lucide-react'
import { buildShotFeedback } from '../../lib/vision/feedback'
import type { ShotEvent, VisionAutoSetupSignal, VisionAutoSetupState, VisionEngineState, VisionShotSummary } from '../../lib/vision/types'
import { ConfidencePill } from './VisionOverlay'

interface Props {
  state?: VisionEngineState
  autoSetup?: VisionAutoSetupState
  lastShot?: ShotEvent
  shots: VisionShotSummary[]
}

function statusColour(active: boolean): string {
  return active ? 'border-emerald-glow/40 bg-emerald-glow/12 text-emerald-glow' : 'border-white/10 bg-white/[0.03] text-white/45'
}

function setupTone(signal?: VisionAutoSetupSignal): string {
  if (!signal) return 'border-white/10 bg-white/[0.03] text-white/50'
  if (signal.status === 'locked') return 'border-emerald-glow/30 bg-emerald-glow/10 text-emerald-glow'
  if (signal.status === 'blocked' || signal.status === 'needs-manual') return 'border-gold/25 bg-gold/10 text-gold'
  return 'border-white/10 bg-white/[0.03] text-white/58'
}

function playerStatusText(state?: VisionEngineState, autoSetup?: VisionAutoSetupState): string {
  if (autoSetup?.player.status === 'blocked') return 'Frame busy'
  if (autoSetup?.player.status === 'locking') return 'Stabilising'
  if (autoSetup?.player.status === 'locked') return state?.player?.selectedByUser ? 'Manual lock' : 'Auto locked'
  return state?.player ? 'Detected' : 'Scanning'
}

function goalStatusText(state?: VisionEngineState, autoSetup?: VisionAutoSetupState): string {
  if (autoSetup?.goal.status === 'locking') return 'Stabilising'
  if (autoSetup?.goal.status === 'locked') return state?.goal.source === 'auto-detected' ? 'Auto locked' : 'Calibrated'
  if (autoSetup?.goal.status === 'scanning') return 'Scanning'
  return state?.goal.calibrated ? 'Calibrated' : 'Needs lock'
}

export default function VisionMetricsPanel({ state, autoSetup, lastShot, shots }: Props) {
  const feedback = buildShotFeedback(lastShot)
  const goals = shots.filter((shot) => shot.outcome === 'goal').length
  const fastest = shots.reduce<VisionShotSummary | undefined>((best, shot) => (!best || shot.speedPxPerSec > best.speedPxPerSec ? shot : best), undefined)
  const best = shots.reduce<VisionShotSummary | undefined>((currentBest, shot) => (!currentBest || shot.qualityScore > currentBest.qualityScore ? shot : currentBest), undefined)
  const accurate = shots.reduce<VisionShotSummary | undefined>(
    (currentBest, shot) => (!currentBest || (shot.outcome === 'goal' && shot.qualityScore > currentBest.qualityScore) ? shot : currentBest),
    undefined,
  )

  return (
    <div className="space-y-3">
      <div className="card card-hi p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="label">Tracking status</div>
            <h2 className="text-2xl font-extrabold">Live lab</h2>
          </div>
          {state?.goal.confidence && <ConfidencePill label="Goal" score={state.goal.confidence} />}
        </div>

        {autoSetup && (
          <div className={`mt-3 rounded-xl border p-3 ${setupTone(autoSetup.player)}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-white/45">Auto setup</div>
                <div className="text-sm font-extrabold">{autoSetup.ready ? 'Session ready' : autoSetup.player.message}</div>
              </div>
              <div className="num text-lg font-extrabold">{Math.round(autoSetup.player.confidence * 100)}%</div>
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className={`rounded-xl border p-3 ${statusColour(Boolean(state?.player && state.player.state !== 'lost'))}`}>
            <BadgeCheck size={17} />
            <div className="mt-1 text-xs font-bold uppercase">Player</div>
            <div className="text-sm font-extrabold">{playerStatusText(state, autoSetup)}</div>
          </div>
          <div className={`rounded-xl border p-3 ${statusColour(Boolean(state?.ball && state.ball.state !== 'lost'))}`}>
            <Target size={17} />
            <div className="mt-1 text-xs font-bold uppercase">Ball</div>
            <div className="text-sm font-extrabold">{autoSetup?.ball.status === 'locked' ? 'Ball locked' : state?.ball?.state === 'lost' ? 'Lost' : 'Scanning'}</div>
          </div>
          <div className={`rounded-xl border p-3 ${statusColour(Boolean(state?.goal.calibrated))}`}>
            <Goal size={17} />
            <div className="mt-1 text-xs font-bold uppercase">Goal</div>
            <div className="text-sm font-extrabold">{goalStatusText(state, autoSetup)}</div>
          </div>
          <div className={`rounded-xl border p-3 ${statusColour(Boolean(lastShot))}`}>
            <Zap size={17} />
            <div className="mt-1 text-xs font-bold uppercase">Shot</div>
            <div className="text-sm font-extrabold">{lastShot ? `${lastShot.metrics.quality.score}/100` : 'Armed'}</div>
          </div>
        </div>

        {state?.warnings.length ? (
          <div className="mt-3 space-y-2">
            {state.warnings.slice(0, 2).map((warning) => (
              <div key={warning} className="flex gap-2 rounded-xl border border-gold/20 bg-gold/10 p-2 text-xs font-semibold text-gold">
                <CircleAlert size={15} /> {warning}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {feedback && (
        <div className="card card-hi overflow-hidden p-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gold-grad" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="label">Post-shot feedback</div>
              <h2 className="text-3xl font-extrabold text-gold">{feedback.title}</h2>
            </div>
            <Award size={28} className="text-gold" />
          </div>
          <p className="mt-2 text-sm font-semibold text-white/75">{feedback.subtitle}</p>
          <div className="mt-3 grid gap-2 text-sm">
            {feedback.details.map((detail) => (
              <div key={detail} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-semibold text-white/68">
                {detail}
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-emerald-glow/10 p-3 text-sm font-bold text-emerald-glow">{feedback.coaching}</p>
        </div>
      )}

      <div className="card card-hi p-4">
        <div className="label">Today</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat icon={<Crosshair size={17} />} label="Attempts" value={shots.length.toString()} />
          <Stat icon={<Goal size={17} />} label="Goals" value={goals.toString()} />
          <Stat icon={<Gauge size={17} />} label="Fastest" value={fastest?.speedKmh ? `${fastest.speedKmh} km/h` : fastest ? `${fastest.speedPxPerSec} px/s` : '--'} />
          <Stat icon={<Award size={17} />} label="Best" value={best ? `${best.qualityScore}/100` : '--'} />
        </div>
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-semibold text-white/58">
          Most accurate: {accurate ? `${accurate.accuracyLabel} · ${accurate.qualityScore}/100` : 'No goal yet'}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-white/45">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="num mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  )
}
