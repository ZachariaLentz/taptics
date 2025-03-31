---

// ✅ README.md
# Taptics 🧠📱

Taptics is a gamified arithmetic training app that levels up your math reflexes. Built with React Native + Expo Router, Supabase, and inspired by Duolingo.

## 🚀 Features
- Progressive flash training with level scaling
- Daily challenges seeded by date
- Streak, XP, and progress tracking
- Admin dashboard with dynamic level config
- Social login (Google, soon Apple)
- Works offline, fast animations, and haptic feedback

## 📦 Tech Stack
- **Frontend:** React Native, Expo, TypeScript, Tailwind
- **Navigation:** expo-router
- **Auth & Backend:** Supabase
- **Design System:** Custom + Duolingo-inspired

## 🛠️ Getting Started
```bash
git clone https://github.com/YOUR_USERNAME/taptics.git
cd taptics
npm install
npx expo start
```

## 🌱 Contributing
Use `dev` branch for active development.

```bash
git checkout -b feature/your-feature-name
```

---

## 📁 Folder Structure
```
/app
  (tabs)/           → Public-facing tabs (home, flash, daily, progress)
  (admin)/          → Admin-only tabs (dashboard, users, config)
  components/       → Shared screens (FlashScreen, DailyScreen, etc.)
  login.tsx
  logout.tsx
  index.tsx         → Redirects to /home
/lib
  flash.ts          → useFlashRound hook
  flashConfig.ts    → Level scaling formulas
  daily.ts          → useDailyChallenge hook
  user.ts           → Auth & profile helpers
  supabase.ts
/assets
  success.mp3, fail.mp3, sfx/
/docs               → Feature tracking, roadmap, internal docs
```

---

Want to contribute or sponsor? Reach out!

Made with 🧠 and ⚡ by Zach
