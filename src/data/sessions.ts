import type { Session, SessionDrill } from '../types'
import { DRILL_BY_ID } from './drills'
import { tierTarget } from '../lib/game'

/** Build a session drill entry from a drill id at a given tier. */
function ref(drillId: string, tier = 1): SessionDrill {
  const drill = DRILL_BY_ID[drillId]
  return {
    drillId,
    tier,
    target: tierTarget(drill, tier),
    durationSec: drill.durationSec,
  }
}

// Built-in training modes. Custom sessions are added by the player at runtime.
export const SESSIONS: Session[] = [
  {
    id: 'quick10',
    name: 'Quick 10',
    mode: 'quick10',
    emoji: '⏱️',
    blurb: 'A fast garden blast — 3 drills, about 10 minutes.',
    isCustom: false,
    drillRefs: [ref('cone-slalom'), ref('one-touch-fence'), ref('target-shooting')],
  },
  {
    id: 'full30',
    name: 'Full 30',
    mode: 'full30',
    emoji: '🏆',
    blurb: 'The big one — every skill, warmup to cooldown.',
    isCustom: false,
    drillRefs: [
      ref('gate-dribbles'),
      ref('one-touch-fence'),
      ref('first-touch-fence'),
      ref('shoot-after-dribble'),
      ref('weak-foot-fence'),
      ref('close-control-box'),
      ref('shuttle-sprints'),
    ],
  },
  {
    id: 'shooting',
    name: 'Shooting Practice',
    mode: 'shooting',
    emoji: '🎯',
    blurb: 'Find the corners and bury your chances.',
    isCustom: false,
    drillRefs: [ref('target-shooting'), ref('shoot-after-dribble'), ref('both-feet-finishing')],
  },
  {
    id: 'dribbling',
    name: 'Dribbling Circuit',
    mode: 'dribbling',
    emoji: '🌀',
    blurb: 'Quick feet and tight close control.',
    isCustom: false,
    drillRefs: [ref('cone-slalom'), ref('gate-dribbles'), ref('close-control-box')],
  },
  {
    id: 'fence',
    name: 'Fence Passing Wall',
    mode: 'fence',
    emoji: '🧱',
    blurb: 'Use the fence as a team-mate that always passes back.',
    isCustom: false,
    drillRefs: [ref('one-touch-fence'), ref('first-touch-fence'), ref('weak-foot-fence')],
  },
  {
    id: 'weakFoot',
    name: 'Weak Foot Day',
    mode: 'weakFoot',
    emoji: '🦶',
    blurb: 'Only your weaker foot today. Double weak-foot progress!',
    isCustom: false,
    drillRefs: [ref('weak-foot-fence'), ref('both-feet-finishing'), ref('gate-dribbles')],
  },
  {
    id: 'fitness',
    name: 'Strong & Safe',
    mode: 'fitness',
    emoji: '',
    blurb: 'Fun moves that build injury-proof ankles, knees and core.',
    isCustom: false,
    drillRefs: [
      ref('jump-and-stick'),
      ref('flamingo-balance'),
      ref('side-shuffle'),
      ref('calf-raises'),
      ref('superhero-plank'),
    ],
  },
  {
    id: 'matchday',
    name: 'Matchday Challenge',
    mode: 'matchday',
    emoji: '⚽',
    blurb: 'Score under pressure and win the match!',
    isCustom: false,
    drillRefs: [ref('shoot-after-dribble', 2), ref('target-shooting', 2), ref('shuttle-sprints', 2)],
  },
]

export const SESSION_BY_ID: Record<string, Session> = Object.fromEntries(
  SESSIONS.map((s) => [s.id, s]),
)
