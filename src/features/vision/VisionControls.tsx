import { Activity, Crosshair, Gauge, Hand, LocateFixed, MousePointer2, Square, Target, Video, Zap } from 'lucide-react'
import type { PerformanceMode } from '../../lib/vision/types'

export type VisionTapMode =
  | 'select-player'
  | 'lock-ball'
  | 'goal-leftPostBase'
  | 'goal-rightPostBase'
  | 'goal-leftPostTop'
  | 'goal-rightPostTop'
  | 'goal-centre'
  | 'target-bottomLeft'
  | 'target-bottomRight'
  | 'target-topLeft'
  | 'target-topRight'
  | 'target-centre'
  | 'ground-plane'

interface Props {
  running: boolean
  mode: PerformanceMode
  tapMode: VisionTapMode
  onModeChange: (mode: PerformanceMode) => void
  onTapModeChange: (mode: VisionTapMode) => void
  onManualShot: () => void
  onResetBall: () => void
  recording: boolean
  recordingSupported: boolean
  onToggleRecording: () => void
}

const MODE_OPTIONS: Array<{ value: PerformanceMode; label: string }> = [
  { value: 'high-accuracy', label: 'High' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'lightweight', label: 'Light' },
]

const TAP_TOOLS: Array<{ value: VisionTapMode; label: string; Icon: typeof MousePointer2 }> = [
  { value: 'select-player', label: 'Caiden', Icon: Hand },
  { value: 'lock-ball', label: 'Ball', Icon: LocateFixed },
  { value: 'ground-plane', label: 'Ground', Icon: Crosshair },
]

export default function VisionControls({
  running,
  mode,
  tapMode,
  onModeChange,
  onTapModeChange,
  onManualShot,
  onResetBall,
  recording,
  recordingSupported,
  onToggleRecording,
}: Props) {
  return (
    <div className="card card-hi p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="label">Vision Mode</div>
          <div className="text-sm font-bold text-white/80">{running ? 'Live tracking' : 'Ready'}</div>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onModeChange(option.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-extrabold uppercase transition ${
                mode === option.value ? 'bg-emerald-glow text-base-900' : 'text-white/55'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {TAP_TOOLS.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => onTapModeChange(value)}
            className={`btn-ghost h-12 flex-col gap-0.5 text-xs ${tapMode === value ? 'border-emerald-glow/60 bg-emerald-glow/15 text-emerald-glow' : ''}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onManualShot} className="btn-primary py-3 text-sm">
          <Zap size={17} /> Mark shot
        </button>
        <button onClick={onResetBall} className="btn-ghost py-3 text-sm">
          <Target size={17} /> Clear ball
        </button>
        <button
          onClick={onToggleRecording}
          disabled={!running || !recordingSupported}
          className={`btn-ghost col-span-2 py-3 text-sm disabled:opacity-45 ${
            recording ? 'border-red-300/40 bg-red-500/15 text-red-100' : 'border-emerald-glow/40 bg-emerald-glow/10 text-emerald-glow'
          }`}
        >
          {recording ? <Square size={17} fill="currentColor" /> : <Video size={17} />}
          {recording ? 'Stop local recording' : 'Record locally'}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-xs text-white/50">
        <Gauge size={15} className="text-gold" />
        <span>High loads models most often. Light uses motion and taps.</span>
        <Activity size={15} className="ml-auto text-emerald-glow" />
      </div>
    </div>
  )
}
