import type { Badge } from '../types'

// Badge definitions. `earnedAt` is filled in when unlocked.
export const BADGE_DEFS: Omit<Badge, 'earnedAt'>[] = [
  { id: 'first-session', name: 'First Whistle', emoji: '📣', description: 'Finish your first training session.' },
  { id: 'streak-3', name: 'On a Roll', emoji: '🔥', description: 'Train 3 days in a row.' },
  { id: 'streak-7', name: 'Unstoppable', emoji: '🌋', description: 'Keep a 7-day streak.' },
  { id: 'sniper', name: 'Sniper', emoji: '🎯', description: 'Score 50 goals in target drills.' },
  { id: 'weak-wand', name: 'Wand of a Weak Foot', emoji: '🪄', description: 'Reach 60 Weak Foot.' },
  { id: 'cone-magician', name: 'Cone Magician', emoji: '🎩', description: 'Reach 70 Dribbling.' },
  { id: 'iron-lungs', name: 'Iron Lungs', emoji: '🫁', description: 'Reach 70 Fitness.' },
  { id: 'level-5', name: 'Rising Star', emoji: '⭐', description: 'Reach Level 5.' },
  { id: 'level-10', name: 'Garden Pro', emoji: '🏅', description: 'Reach Level 10.' },
  { id: 'pb-breaker', name: 'Record Breaker', emoji: '💥', description: 'Beat 10 personal bests.' },
]
