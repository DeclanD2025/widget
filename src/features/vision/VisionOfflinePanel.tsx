import { CloudOff, Cpu, ShieldCheck } from 'lucide-react'
import type { VisionOfflinePackStatus } from '../../lib/vision/modelLoader'

interface Props {
  status?: VisionOfflinePackStatus
  onRefresh: () => void
}

export default function VisionOfflinePanel({ status, onRefresh }: Props) {
  const ready = Boolean(status?.ready)
  const label = ready ? 'Ready offline' : status ? 'Needs first online load' : 'Checking'

  return (
    <div className="card card-hi p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label">Offline Vision Pack</div>
          <h2 className={`text-2xl font-extrabold ${ready ? 'text-emerald-glow' : 'text-gold'}`}>{label}</h2>
        </div>
        {ready ? <ShieldCheck size={25} className="text-emerald-glow" /> : <CloudOff size={25} className="text-gold" />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <PackItem label="Player pose" ready={Boolean(status?.poseReady)} />
        <PackItem label="Ball/object" ready={Boolean(status?.objectReady)} />
      </div>

      <p className="mt-3 text-xs font-semibold text-white/45">
        These model files are bundled with Garden Baller and precached by the PWA for garden sessions without signal.
      </p>
      <button onClick={onRefresh} className="btn-ghost mt-3 w-full py-2 text-sm">
        <Cpu size={15} /> Check offline pack
      </button>
    </div>
  )
}

function PackItem({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${ready ? 'border-emerald-glow/30 bg-emerald-glow/10 text-emerald-glow' : 'border-gold/25 bg-gold/10 text-gold'}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-sm font-extrabold">{ready ? 'Local' : 'Missing'}</div>
    </div>
  )
}
