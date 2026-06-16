import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title?: string
  kicker?: string
  back?: boolean
  children: ReactNode
}

export default function Page({ title, kicker, back, children }: Props) {
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
            <button onClick={() => nav(-1)} className="btn-ghost h-10 w-10" aria-label="Back">
              <ChevronLeft size={22} />
            </button>
          )}
          {title && (
            <div>
              {kicker && <div className="label">{kicker}</div>}
              <h1 className="text-3xl font-extrabold leading-none">{title}</h1>
            </div>
          )}
        </header>
      )}
      {children}
    </motion.div>
  )
}
