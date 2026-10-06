# 📦 Taptics Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] - 2026-10-06

### Changed
- Repaired guest/session boot and separated four user tabs from Flash/results/login.
- Added deterministic progressive arithmetic, sequential Flash terms, ten-answer scoring and locked feedback.
- Persisted Daily completion and completion-based XP/streak/history; added real Progress and account controls.
- Added local-first storage, offline sync, canonical Supabase migrations/RLS and atomic idempotent awards.
- Replaced deprecated audio playback, retained sound assets, added haptics and shared accessible controls.
- Removed unfinished admin/demo routes, executable formulas, hardcoded deployment values and unused assets/dependencies.
- Added game/UI/persistence/session/database tests, CI, accurate setup docs and release checklist.

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
