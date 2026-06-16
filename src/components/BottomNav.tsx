import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', emoji: '🏠', end: true },
  { to: '/today', label: 'Today', emoji: '⚽', end: false },
  { to: '/dashboard', label: 'Stats', emoji: '📊', end: false },
  { to: '/badges', label: 'Badges', emoji: '🏅', end: false },
  { to: '/profile', label: 'Player', emoji: '👤', end: false },
]

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-pitch-dark/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-1.5">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-semibold transition ${
                isActive ? 'text-pitch-light' : 'text-white/55'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-2xl transition-transform ${isActive ? 'scale-110' : ''}`}>{t.emoji}</span>
                <span>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
