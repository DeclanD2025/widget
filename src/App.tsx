import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import BottomNav from './components/BottomNav'
import Start from './pages/Start'
import Profile from './pages/Profile'
import Goals from './pages/Goals'
import Today from './pages/Today'
import Modes from './pages/Modes'
import CustomBuilder from './pages/CustomBuilder'
import SessionRunner from './pages/SessionRunner'
import Done from './pages/Done'
import Dashboard from './pages/Dashboard'
import Badges from './pages/Badges'
import Missions from './pages/Missions'
import DrillDetail from './pages/DrillDetail'
import Settings from './pages/Settings'

export default function App() {
  const location = useLocation()
  // Hide the tab bar while running a drill or celebrating, for a focused, full-screen feel.
  const hideNav = /^\/(session|done)/.test(location.pathname)

  return (
    <div className="mx-auto min-h-full max-w-md pb-24">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname.split('/')[1] || 'home'}>
          <Route path="/" element={<Start />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/today" element={<Today />} />
          <Route path="/modes" element={<Modes />} />
          <Route path="/custom" element={<CustomBuilder />} />
          <Route path="/session/:id" element={<SessionRunner />} />
          <Route path="/done" element={<Done />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/badges" element={<Badges />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/drills/:id" element={<DrillDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AnimatePresence>
      {!hideNav && <BottomNav />}
    </div>
  )
}
