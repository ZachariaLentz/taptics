# Taptics v1 feature status

| Area            | Implemented behavior                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| Boot/navigation | Local guest boot, persisted account session, four user tabs and separate transient screens                          |
| Flash           | Profile-level difficulty, individual terms, ten accepted answers, locked submissions, feedback and persisted result |
| Progression     | 7/10 pass rule, capped at level 100; 10 XP/correct plus 20 on pass                                                  |
| Daily           | Player/date seeded puzzle and choices, one saved submission per local day, persistent completed state               |
| Streak          | Consecutive local activity dates from saved completions                                                             |
| Progress        | Real completion counts, accuracy, XP, level, streak and recent activity                                             |
| Profile         | Device guest/account separation, email auth, sync/logout and account deletion                                       |
| Backend         | Versioned schema, private RLS reads, RPC-only atomic awards, unique Daily and session constraints                   |
| Feedback        | Shared sound/haptic feedback, explicit text feedback and accessible buttons                                         |
| Admin           | Removed from production routes; typed source configuration controls gameplay                                        |

Account rewards are optimistic while offline; a conflicting Daily is reconciled to the first stored cloud completion. Device dates and reported scores are not tamper-proof. Rich analytics, social features, subscriptions, leaderboards and OAuth are outside v1.
