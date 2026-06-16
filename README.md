# ⚽ Garden Baller

An offline-first football training game for a young player who wants to improve using
only basic garden equipment: **2 goals, 2 fences, cones and a ball**. It hands him a
session, times each drill, takes his scores, and turns every bit of practice into XP,
levels, skill ratings and badges — so getting better feels like a game, not homework.

Built to live on an **iPad / iPhone**: install it to the Home Screen and it runs
full-screen and fully offline in the garden.

## Tech stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** — green pitch theme, big bold cards
- **Framer Motion** — confetti, level-ups, animated skill bars
- **Zustand** — transient run state
- **Dexie.js (IndexedDB)** — all progress saved locally on the device, no login
- **vite-plugin-pwa** — installable, offline service worker

## Getting started

```bash
npm install
npm run dev        # development server
npm run build      # type-check + production build (outputs dist/)
npm run preview    # serve the production build
```

## Add it to an iPhone / iPad

Open the site in **Safari** → tap **Share** → **Add to Home Screen**. It then launches
like a real app, full-screen, and works with no internet.

## What's inside (Phase 0–2)

- **Onboarding & player card** — name, age, strong foot, club colour, avatar, FIFA-style
  rating card with an overall (OVR) and six skill stats.
- **Core training loop** — pick a session → step through drills (instructions → big
  countdown timer → score entry) → celebration screen that awards XP, fills skill bars,
  updates the streak and unlocks badges.
- **Training modes** — Quick 10, Full 30, Shooting, Dribbling, Fence Wall, Weak Foot Day,
  Matchday, plus a custom session builder.
- **Garden drills** — 12 drills using only goals, fences, cones and a ball, with 5
  difficulty tiers (more reps, smaller targets, shorter time as you level up).
- **Gamification** — XP, levels, daily streaks, "beat your best", skill badges,
  unlockable drill cards, weekly missions.
- **Progress dashboard** — rating card, skill bars, level bar, session history.

## Project structure

```
src/
  data/        drills, sessions, badge definitions
  db/          Dexie database + seeding
  lib/         game maths (tiers, XP, levels, skills) and the completion engine
  hooks/       reactive IndexedDB queries (dexie-react-hooks)
  store/       Zustand run store
  components/  PlayerCard, SkillBar, ProgressRing, Confetti, nav, page shell
  pages/       Start, Profile, Goals, Today, Modes, CustomBuilder, SessionRunner,
               Done, Dashboard, Badges, Missions, DrillDetail, Settings
```

## Roadmap

- **Phase 3** — adaptive difficulty engine, richer matchday pressure, more drills, sounds.
- **Phase 4** — optional cloud sync + a parent/coach dashboard (Supabase).
