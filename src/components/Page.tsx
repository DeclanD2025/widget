import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Props {
  title?: string
  back?: boolean
  children: ReactNode
}

export default function Page({ title, back, children }: Props) {
  const nav = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="safe-top px-4"
    >
      {(title || back) && (
        <header className="flex items-center gap-3 py-3">
          {back && (
            <button onClick={() => nav(-1)} className="btn-ghost h-10 w-10 text-xl" aria-label="Back">
              ←
            </button>
          )}
          {title && <h1 className="text-2xl font-extrabold">{title}</h1>}
        </header>
      )}
      {children}
    </motion.div>
  )
}
