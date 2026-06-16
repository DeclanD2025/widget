import { Link } from 'react-router-dom'
import Page from '../components/Page'
import SessionCard from '../components/SessionCard'
import { SESSIONS } from '../data/sessions'
import { useCustomSessions } from '../hooks/useData'

export default function Modes() {
  const custom = useCustomSessions()
  return (
    <Page title="Training Modes" back>
      <div className="space-y-3">
        {SESSIONS.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </div>

      {custom && custom.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-white/60">Your sessions</h2>
          <div className="space-y-3">
            {custom.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </>
      )}

      <Link to="/custom" className="btn-ghost mt-4 flex w-full items-center justify-center gap-2 py-4 text-lg">
        🛠️ Build your own session
      </Link>
    </Page>
  )
}
