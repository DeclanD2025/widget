import { Link } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import Page from '../components/Page'
import SessionCard from '../components/SessionCard'
import { SESSIONS } from '../data/sessions'
import { useCustomSessions } from '../hooks/useData'

export default function Modes() {
  const custom = useCustomSessions()
  return (
    <Page title="Training Modes" kicker="Choose your session" back>
      <div className="space-y-3">
        {SESSIONS.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </div>

      {custom && custom.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 label">Your sessions</h2>
          <div className="space-y-3">
            {custom.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </>
      )}

      <Link to="/custom" className="btn-ghost mt-4 w-full py-4 text-lg">
        <Wrench size={18} /> Build your own session
      </Link>
    </Page>
  )
}
