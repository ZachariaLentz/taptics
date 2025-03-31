# 📦 Taptics Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.3.0] - 2024-03-31
### Added
- 🚀 Created `/docs/feature-tracking.ts` to track active feature versions
- 🎯 Protected `main` with GitHub rules, introduced `dev` branch workflow
- ✅ Setup clean project structure, .gitignore, and README
- 🎛 Admin dashboard now configurable via Supabase `level_config`

## [0.2.0] - 2024-03-30
### Added
- 🎮 Game logic scaling: `flashConfig.ts` formulas for flash delay, operators
- 📊 Admin-only dashboard with config inputs
- 📥 Supabase auth + anonymous fallback, Google login POC
- 🧠 Daily challenge generated from date seed

### Changed
- 💡 FlashScreen updated to show one number at a time
- 🎧 Centralized sound effects using `useSoundEffects()` hook

## [0.1.0] - 2024-03-28
### Added
- 🧪 MVP created with Flash Training + Daily Challenge
- 📲 Basic navigation via `expo-router`
- ✅ Supabase profile handling
- 🎵 Local audio feedback for correct/incorrect answers
