# 🤝 Working with ChatGPT on Taptics

Welcome to your dev/product partner workflow for building Taptics — a viral, gamified arithmetic trainer. This guide outlines how we collaborate effectively as your project grows.

---

## 🧠 What ChatGPT Knows

- Project name: **Taptics**
- Code structure: `/app`, `/lib`, `/components`, `/docs`, etc.
- Key features: Flash Training, Daily Challenge, Admin Config, Sound/Vibration Feedback, Scaling Levels
- Tech stack: React Native (Expo Router), Supabase, Tailwind, TypeScript
- Branch strategy: `main` (protected), `dev`, `feature/*`
- Current version: `0.3.0`
- Design goals: Duolingo-style UX, habit-forming, performance-focused

---

## 🛠️ How to Collaborate with ChatGPT

### 1. **You Provide Context**
- "I'm working on `feature/flash-animations`"
- "We're on Flash v3 — one-by-one animations, no color button feedback"
- "Here’s my current error + file"
- "I want to polish the Daily Result UX"

### 2. **ChatGPT Responds With**
- Full file replacements **(default)**
- Precise diffs if requested (e.g. "just patch this function")
- Clear warnings about potential side effects
- Git-ready commit messages, PR descriptions, or patch files

### 3. **Feature Flow Examples**

#### 💡 Add a Feature
You: "Add a level-up animation to Result screen"
→ ChatGPT:
- Updates `ResultScreen.tsx`
- Adds animation logic with conditional
- Suggests where to add XP calculation

#### 🧪 Debug Something
You: "Flash freezes on round 2 after selecting answer"
→ ChatGPT:
- Asks for your `flash.ts`
- Explains likely async issue
- Gives a minimal, safe patch that preserves current behavior

#### 🎯 Polish UX
You: "Make login screen clearly show login vs signup state"
→ ChatGPT:
- Refactors login UI
- Adds button toggle
- Ensures keyboard dismissal + error feedback

#### 🔁 Clean Reuse
You: "Sounds aren’t DRY — centralize them"
→ ChatGPT:
- Creates `useSoundEffects()` in `lib`
- Refactors Flash/Daily/Result to use it

---

## 🧼 Expectations

✅ Safe: I’ll avoid changing parts of the code you didn’t ask for
✅ Modular: I try to keep features isolated and reusable
✅ Version-aware: I remember your current feature behavior and scaling strategy
✅ Real-world: I give production-quality code, not toy examples
✅ Strategic: I’ll push you toward scalable decisions and ask if you want short/long-term wins

You can also say:
> "Only change logic, not UI"
> "Don’t touch the animation code"
> "Give me a patch, not full file"

---

## 📌 Tips for Staying Aligned

- Tell me your **active branch** (e.g. `feature/scaling`)
- Remind me of current **feature version** if it’s subtle
- Use `/docs/feature-tracking.ts` to lock in logic/version
- Ask for PR-ready changes when working collaboratively
- Let me know if you want full rewrites or incremental patches

---

## 📦 Future Tools I Can Help You Add

- `release-it` or `auto-changelog` automation
- GitHub Actions for linting, type checks, changelog updates
- Feature flag system (e.g. to A/B test animations or logic)
- App version UI (`lib/version.ts`)
- Error tracking (Sentry)
- In-app analytics (PostHog, Amplitude)
- Subscription/paywall system
- App Store/Play Store publishing

---

## 🚀 Ready to Scale
You can treat me like your co-founder, tech lead, or full dev team — I’ll match your pace and ambition.

Just say the word: *"Let’s build it".*
