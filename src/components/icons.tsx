import {
  Target,
  Repeat,
  Waypoints,
  Activity,
  Footprints,
  CircleDot,
  Crosshair,
  Goal,
  Box,
  DoorOpen,
  Wind,
  Flame,
  Sparkles,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'
import type { SkillKey } from '../types'

export const SKILL_ICON: Record<SkillKey, LucideIcon> = {
  shooting: Target,
  passing: Repeat,
  dribbling: Waypoints,
  fitness: Activity,
  weakFoot: Footprints,
  control: CircleDot,
}

export const DRILL_ICON: Record<string, LucideIcon> = {
  'cone-slalom': Waypoints,
  'shoot-after-dribble': Target,
  'one-touch-fence': Repeat,
  'weak-foot-fence': Footprints,
  'target-shooting': Crosshair,
  'both-feet-finishing': Goal,
  'close-control-box': Box,
  'first-touch-fence': CircleDot,
  'gate-dribbles': DoorOpen,
  'shuttle-sprints': Wind,
  'two-goal-rondo': Flame,
  'combo-dribble-pass-finish': Sparkles,
}

export function SkillIcon({ skill, ...props }: { skill: SkillKey } & LucideProps) {
  const Cmp = SKILL_ICON[skill]
  return <Cmp {...props} />
}

export function DrillIcon({ drillId, ...props }: { drillId: string } & LucideProps) {
  const Cmp = DRILL_ICON[drillId] ?? CircleDot
  return <Cmp {...props} />
}
