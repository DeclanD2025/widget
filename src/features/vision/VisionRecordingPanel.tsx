import { Download, Film, HardDrive, Play, Trash2 } from 'lucide-react'
import type { VisionRecordingSummary } from '../../lib/vision/types'

interface Props {
  recordings: VisionRecordingSummary[]
  recordingStatus: string
  onOpen: (recording: VisionRecordingSummary) => void
  onDownload: (recording: VisionRecordingSummary) => void
  onDelete: (recording: VisionRecordingSummary) => void
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function VisionRecordingPanel({ recordings, recordingStatus, onOpen, onDownload, onDelete }: Props) {
  return (
    <div className="card card-hi p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Local recordings</div>
          <h2 className="text-2xl font-extrabold">Session clips</h2>
        </div>
        <Film size={24} className="text-gold" />
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-semibold text-white/58">
        <span className="inline-flex items-center gap-2">
          <HardDrive size={15} className="text-emerald-glow" />
          {recordingStatus}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {recordings.length === 0 && <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm font-semibold text-white/42">No local clips saved yet.</div>}
        {recordings.map((recording) => (
          <div key={recording.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-extrabold">{new Date(recording.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-xs font-semibold text-white/42">
                  {formatDuration(recording.durationMs)} · {formatSize(recording.sizeBytes)} · {recording.shotCount} shots
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => onOpen(recording)} className="btn-ghost h-9 w-9" aria-label="Open recording">
                  <Play size={15} />
                </button>
                <button onClick={() => onDownload(recording)} className="btn-ghost h-9 w-9" aria-label="Download recording">
                  <Download size={15} />
                </button>
                <button onClick={() => onDelete(recording)} className="btn-ghost h-9 w-9 text-red-200" aria-label="Delete recording">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
