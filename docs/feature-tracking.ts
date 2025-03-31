// ✅ Feature Tracker for Taptics
// This defines the current version and behavior of major features

export const appFeatures = {
  flashScreen: {
    version: 'v3',
    behavior: 'Animated one-by-one display of terms with sound/vibration feedback',
    correctLogic: 'Plays success/fail sound and tracks correct count',
    animation: 'React Native view transitions (no color feedback on button)'
  },

  dailyChallenge: {
    version: 'v2',
    behavior: 'One daily puzzle per user based on seeded date',
    answerType: 'Multiple choice',
    feedback: 'Plays sound and records result to Supabase',
    access: 'Locked after submission (one per day)'
  },

  resultScreen: {
    version: 'v2',
    display: 'Only shows pass/fail result, score, and level',
    animation: 'None currently',
    redirect: 'Back to /home'
  },

  soundEffects: {
    sharedHook: 'useSoundEffects()',
    files: ['success.mp3', 'fail.mp3'],
    location: 'assets/',
    alias: '@assets/*',
    feedback: 'Used in Flash, Daily, and Result'
  },

  navigation: {
    structure: 'expo-router + layouts (tabs, admin, shared)',
    adminAccess: 'Role-based tab visibility',
    userFlow: 'Starts at /home, accesses flash/daily/progress',
    adminFlow: 'Access to admin tabs, config, gameplay index'
  },

  levelScaling: {
    source: 'lib/flashConfig.ts',
    logic: 'Configurable formula-based scaling of flash difficulty',
    adminConfigurable: true,
    affects: 'flash delay, value range, operation types'
  }
};
