import { lazy, Suspense, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import BottomNav from './components/BottomNav'
import Onboarding from './components/Onboarding'
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
import KeepyUppy from './pages/KeepyUppy'
import DrillDetail from './pages/DrillDetail'
import Settings from './pages/Settings'
import Garden from './pages/Garden'
import Learn from './pages/Learn'
import SkillGuide from './pages/SkillGuide'
import TacticGuide from './pages/TacticGuide'

const VisionPage = lazy(() => import('./features/vision/VisionPage'))

export default function App() {
  const location = useLocation()
  // Hide the tab bar while running a drill or celebrating, for a focused, full-screen feel.
  const isVision = /^\/vision/.test(location.pathname)
  const hideNav = /^\/(session|done)/.test(location.pathname) || isVision

  // Show the welcome tutorial the first time Caiden opens the app.
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem('gb-onboarded') === '1'
    } catch {
      return true
    }
  })

  if (!onboarded) return <Onboarding onDone={() => setOnboarded(true)} />

  return (
    <div className={`mx-auto min-h-full ${isVision ? 'max-w-7xl pb-0' : 'max-w-md pb-24'}`}>
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
          <Route path="/garden" element={<Garden />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/skill/:id" element={<SkillGuide />} />
          <Route path="/learn/tactic/:id" element={<TacticGuide />} />
          <Route
            path="/vision"
            element={
              <Suspense fallback={<div className="safe-top p-5 text-center font-semibold text-white/45">Loading Vision...</div>}>
                <VisionPage />
              </Suspense>
            }
          />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/badges" element={<Badges />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/challenge" element={<KeepyUppy />} />
          <Route path="/drills/:id" element={<DrillDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AnimatePresence>
      {!hideNav && <BottomNav />}
    </div>
  )
}
