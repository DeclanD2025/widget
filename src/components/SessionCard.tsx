import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Session } from '../types'

export default function SessionCard({ session }: { session: Session }) {
  const nav = useNavigate()
  const minutes = Math.max(1, Math.round(session.drillRefs.reduce((s, d) => s + d.durationSec, 0) / 60))
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => nav(`/session/${session.id}`)}
      className="card flex w-full items-center gap-4 p-4 text-left"
    >
      <span className="text-4xl">{session.emoji}</span>
      <span className="flex-1">
        <span className="block text-lg font-extrabold leading-tight">{session.name}</span>
        <span className="block text-sm text-white/60">{session.blurb}</span>
      </span>
      <span className="shrink-0 rounded-full bg-black/30 px-3 py-1 text-sm font-bold">
        {session.drillRefs.length} · ~{minutes}m
      </span>
    </motion.button>
  )
}
