import { Check, Crosshair, ScanSearch, Save, Target } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { calibrationCompleteness } from '../../lib/vision/calibration'
import type { GoalAutoSuggestion, GoalCalibration, PerformanceMode, Point2D } from '../../lib/vision/types'
import type { VisionTapMode } from './VisionControls'

interface Props {
  goal: GoalCalibration
  groundPlane: Point2D[]
  profileName: string
  knownMetres: string
  fixedIpad: boolean
  mode: PerformanceMode
  tapMode: VisionTapMode
  goalSuggestion?: GoalAutoSuggestion
  onTapModeChange: (mode: VisionTapMode) => void
  onGoalChange: Dispatch<SetStateAction<GoalCalibration>>
  onGroundChange: Dispatch<SetStateAction<Point2D[]>>
  onProfileNameChange: (value: string) => void
  onKnownMetresChange: (value: string) => void
  onFixedIpadChange: (value: boolean) => void
  onSave: () => void
  onUseGoalSuggestion: () => void
}

const GOAL_TOOLS: Array<{ mode: VisionTapMode; label: string }> = [
  { mode: 'goal-leftPostBase', label: 'Left base' },
  { mode: 'goal-rightPostBase', label: 'Right base' },
  { mode: 'goal-leftPostTop', label: 'Left top' },
  { mode: 'goal-rightPostTop', label: 'Right top' },
  { mode: 'goal-centre', label: 'Centre' },
]

const TARGET_TOOLS: Array<{ mode: VisionTapMode; label: string }> = [
  { mode: 'target-bottomLeft', label: 'Bottom L' },
  { mode: 'target-bottomRight', label: 'Bottom R' },
  { mode: 'target-topLeft', label: 'Top L' },
  { mode: 'target-topRight', label: 'Top R' },
  { mode: 'target-centre', label: 'Centre' },
]

function hasGoalPoint(goal: GoalCalibration, mode: VisionTapMode): boolean {
  switch (mode) {
    case 'goal-leftPostBase':
      return Boolean(goal.leftPostBase)
    case 'goal-rightPostBase':
      return Boolean(goal.rightPostBase)
    case 'goal-leftPostTop':
      return Boolean(goal.leftPostTop)
    case 'goal-rightPostTop':
      return Boolean(goal.rightPostTop)
    case 'goal-centre':
      return Boolean(goal.centre)
    case 'target-bottomLeft':
      return Boolean(goal.targetZones.bottomLeft)
    case 'target-bottomRight':
      return Boolean(goal.targetZones.bottomRight)
    case 'target-topLeft':
      return Boolean(goal.targetZones.topLeft)
    case 'target-topRight':
      return Boolean(goal.targetZones.topRight)
    case 'target-centre':
      return Boolean(goal.targetZones.centre)
    default:
      return false
  }
}

export default function VisionCalibrationPanel({
  goal,
  groundPlane,
  profileName,
  knownMetres,
  fixedIpad,
  mode,
  tapMode,
  goalSuggestion,
  onTapModeChange,
  onGoalChange,
  onGroundChange,
  onProfileNameChange,
  onKnownMetresChange,
  onFixedIpadChange,
  onSave,
  onUseGoalSuggestion,
}: Props) {
  const completeness = calibrationCompleteness(goal, { groundPlane, knownMeasurement: undefined })
  const suggestionReady = goalSuggestion && goalSuggestion.confidence.score >= 0.42

  return (
    <div className="card card-hi p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Calibration</div>
          <h2 className="text-2xl font-extrabold">Goal & garden</h2>
        </div>
        <div className="num text-3xl font-extrabold text-gold">{completeness}%</div>
      </div>

      <label className="mt-3 block">
        <span className="label">Profile name</span>
        <input
          value={profileName}
          onChange={(event) => onProfileNameChange(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-semibold outline-none focus:border-emerald-glow"
        />
      </label>

      <div className={`mt-4 rounded-xl border p-3 ${goalSuggestion ? 'border-emerald-glow/25 bg-emerald-glow/10' : 'border-white/10 bg-white/[0.03]'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-white/75">
              <ScanSearch size={16} className={goalSuggestion?.status === 'locked' ? 'text-emerald-glow' : 'text-gold'} /> Auto goal
            </div>
            <div className="mt-1 text-xs font-semibold text-white/52">
              {goalSuggestion
                ? goalSuggestion.status === 'locked'
                  ? goalSuggestion.applied
                    ? 'Goal auto-lock active'
                    : 'Goal suggestion ready'
                  : 'Stabilising goal shape'
                : 'Scanning for a white goal frame'}
            </div>
          </div>
          <div className="num text-2xl font-extrabold text-gold">{goalSuggestion ? `${Math.round(goalSuggestion.confidence.score * 100)}%` : '--'}</div>
        </div>
        <button onClick={onUseGoalSuggestion} disabled={!suggestionReady} className="btn-ghost mt-3 w-full py-2 text-sm disabled:opacity-45">
          <Check size={16} /> Use suggestion
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white/75">
          <Target size={16} className="text-emerald-glow" /> Goal points
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onTapModeChange('goal-box')}
            className={`btn-ghost justify-between px-3 py-2 text-sm ${tapMode === 'goal-box' ? 'border-emerald-glow/60 bg-emerald-glow/15 text-emerald-glow' : ''}`}
          >
            Quick goal box
            {goal.leftPostBase && goal.rightPostBase && goal.leftPostTop && goal.rightPostTop && <Check size={15} />}
          </button>
          {GOAL_TOOLS.map((tool) => (
            <button
              key={tool.mode}
              onClick={() => onTapModeChange(tool.mode)}
              className={`btn-ghost justify-between px-3 py-2 text-sm ${tapMode === tool.mode ? 'border-emerald-glow/60 bg-emerald-glow/15 text-emerald-glow' : ''}`}
            >
              {tool.label}
              {hasGoalPoint(goal, tool.mode) && <Check size={15} />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white/75">
          <Crosshair size={16} className="text-gold" /> Target zones
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TARGET_TOOLS.map((tool) => (
            <button
              key={tool.mode}
              onClick={() => onTapModeChange(tool.mode)}
              className={`btn-ghost justify-between px-3 py-2 text-sm ${tapMode === tool.mode ? 'border-gold/60 bg-gold/10 text-gold' : ''}`}
            >
              {tool.label}
              {hasGoalPoint(goal, tool.mode) && <Check size={15} />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={() => onTapModeChange('ground-plane')}
          className={`btn-ghost px-3 py-3 text-sm ${tapMode === 'ground-plane' ? 'border-gold/60 bg-gold/10 text-gold' : ''}`}
        >
          <Crosshair size={16} /> Mark ground ({groundPlane.length}/4)
        </button>
        <button onClick={() => onGroundChange([])} className="btn-ghost px-3 py-3 text-sm">
          Clear
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label>
          <span className="label">Known metres</span>
          <input
            value={knownMetres}
            inputMode="decimal"
            onChange={(event) => onKnownMetresChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-semibold outline-none focus:border-emerald-glow"
          />
        </label>
        <label className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={fixedIpad}
            onChange={(event) => onFixedIpadChange(event.target.checked)}
            className="h-5 w-5 accent-emerald-glow"
          />
          Fixed iPad
        </label>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={onSave} className="btn-emerald flex-1 py-3">
          <Save size={17} /> Save calibration
        </button>
        <button onClick={() => onGoalChange({ targetZones: {} })} className="btn-ghost px-3 py-3 text-sm">
          Reset goal
        </button>
      </div>

      <p className="mt-3 text-xs text-white/42">
        Mode: {mode}. Auto goal tries to adapt when the iPad moves. Quick goal box and point tools remain available for correction.
      </p>
    </div>
  )
}
