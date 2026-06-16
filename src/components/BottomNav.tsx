import { NavLink } from 'react-router-dom'
import { Home, Dumbbell, BarChart3, Medal, MapPin } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/today', label: 'Train', Icon: Dumbbell, end: false },
  { to: '/garden', label: 'Garden', Icon: MapPin, end: false },
  { to: '/dashboard', label: 'Stats', Icon: BarChart3, end: false },
  { to: '/badges', label: 'Awards', Icon: Medal, end: false },
]

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-base-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-1.5">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                isActive ? 'text-gold' : 'text-white/40'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.4 : 2} className={isActive ? 'drop-shadow-[0_0_8px_rgba(244,201,93,0.5)]' : ''} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
