import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, ChevronRight, Users } from 'lucide-react'
import type { Session } from '../types'
import { DrillIcon } from './icons'

export default function SessionCard({ session, featured }: { session: Session; featured?: boolean }) {
  const nav = useNavigate()
  const minutes = Math.max(1, Math.round(session.drillRefs.reduce((s, d) => s + d.durationSec, 0) / 60))
  const lead = session.drillRefs[0]?.drillId ?? ''

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => nav(`/session/${session.id}`)}
      className={`card card-hi flex w-full items-center gap-4 p-4 text-left ${featured ? 'shadow-emerald' : ''}`}
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
          featured ? 'bg-emerald-glow/20 text-emerald-glow' : 'bg-white/[0.06] text-white/70'
        }`}
      >
        <DrillIcon drillId={lead} size={24} />
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-2 text-lg font-bold leading-tight">
          {session.name}
          {session.mode === 'partner' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
              <Users size={11} /> 2P
            </span>
          )}
        </span>
        <span className="block text-sm text-white/55">{session.blurb}</span>
        <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/45">
          <Clock size={13} /> ~{minutes} min · {session.drillRefs.length} drills
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-white/30" />
    </motion.button>
  )
}
