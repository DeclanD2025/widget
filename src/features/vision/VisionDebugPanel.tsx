import { Bug, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { VisionDebugInfo } from '../../lib/vision/types'

interface Props {
  debug?: VisionDebugInfo
}

export default function VisionDebugPanel({ debug }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card card-hi p-3">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 font-extrabold">
          <Bug size={17} className="text-gold" /> Debug panel
        </span>
        <ChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <DebugItem label="FPS" value={debug ? Math.round(debug.fps).toString() : '--'} />
          <DebugItem label="Frame" value={debug ? `${debug.frameSize.width}x${debug.frameSize.height}` : '--'} />
          <DebugItem label="Pose model" value={debug?.modelStatus.pose ?? 'idle'} />
          <DebugItem label="Object model" value={debug?.modelStatus.object ?? 'idle'} />
          <DebugItem label="Offline pack" value={debug?.modelStatus.offlinePack ?? 'unknown'} />
          <DebugItem label="Backend" value={debug?.modelStatus.backend ?? '--'} />
          <DebugItem label="Detections" value={debug?.detectionsPerFrame.toString() ?? '0'} />
          <DebugItem label="Ball lost" value={debug?.ballLostCount.toString() ?? '0'} />
          <DebugItem label="Player lost" value={debug?.playerLostCount.toString() ?? '0'} />
          <DebugItem label="Shot state" value={debug?.shotDetectorState ?? 'idle'} />
          <DebugItem label="Calibration" value={debug ? `${debug.calibrationCompleteness}%` : '0%'} />
          <DebugItem label="Ball conf" value={debug ? `${Math.round(debug.confidence.ball * 100)}%` : '0%'} />
          <DebugItem label="Player conf" value={debug ? `${Math.round(debug.confidence.player * 100)}%` : '0%'} />
          {debug?.messages.map((message) => (
            <div key={message} className="col-span-2 rounded-xl border border-gold/20 bg-gold/10 p-2 font-semibold text-gold">
              {message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DebugItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">{label}</div>
      <div className="mt-1 break-words font-bold text-white/75">{value}</div>
    </div>
  )
}
