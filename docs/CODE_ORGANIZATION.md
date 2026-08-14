# Code organization

Keep files findable. A “god file” (one module that owns many unrelated jobs) is how bugs hide.

## Hard limits

| Kind | Soft cap | Must split at |
| --- | --- | --- |
| React component | 300 lines | 400 lines |
| API domain module | 200 lines | 300 lines |
| Express route file | 300 lines | 400 lines |
| CSS file | 400 lines per concern | add a new section file or keep tokens in `index.css` only |

If a file is about to cross the must-split line, extract a named module **before** adding more.

## Repo layout

```
/
  README.md
  package.json
  docs/                    product + engineering docs
    CODE_ORGANIZATION.md
    FDesign.md             visual language (glass, motion, loading)
    DEVICES.md             spatial contract — any width/height
    changes.md
    deploy.md
  scripts/
    start-minio-docker.ps1
  backend/
  frontend/
```

## Frontend

```
frontend/src/
  App.jsx / index.jsx / index.css     entry + CSS barrel
  api/                                HTTP client + one file per domain
    client.js                         fetch, CSRF, tokens, logout — no endpoints
    index.js                          public barrel
    api.js                            legacy re-export of index.js
    stories.js, hubs.js, auth.js, …
  styles/                             CSS sections imported by index.css
    layout.css                        page / split / overlay shells (DEVICES.md)
    auth.css                          auth screens (imported by Auth / VerifyEmail)
  utils/                              screenCache, likeColors
  hooks/                              one hook per file
  icons/
  routes/                             URL param wrappers only
  components/
    admin/                            AdminDashboard + analytics pages + styles
    auth/                             Auth, VerifyEmail, UsernameSetup, forms
    common/                           shared UI (dialog, toast, search, like, …)
    feed/                             CommunityFeed + header/sidebar/banners
    hub/                              directory, create, detail, tabs
    leaderboard/                      sidebar widget + full page
    moderation/                       ModerationDashboard + panels + ReportModal
    settings/                         Settings
    skeletons/                        placeholders by story / page / hub / widget
    social/                           bookmarks, following, notifications, profile
    story/                            reader, writer, lists, edit requests, writer analytics
    thread/                           ThreadView + cards / compose / report
```

- New API functions go in the matching `api/*.js` file. **Never** add endpoints to `client.js` or grow `api.js`.
- New full-page skeletons go in `skeletons/pageSkeletons.jsx` (or a new group file if that one is full).
- New routed screens: page in the matching `components/<domain>/` folder, wrapper in `routes/` if it needs params or auth preload.
- Shared primitives go in `components/common/`. Do not leave new screens at `components/` root.

## Backend

```
backend/
  server.js                entry (mounts only — no domain logic)
  middleware/              auth, csrf, rate limits, sanitization, uploads
  models/                  one Mongoose model per file
  services/                email, translation
  jobs/                    cron job bodies
  scripts/                 one-off migrations
  utils/                   logger, storage, pagination, scheduler, …
  routes/
    admin/                 stats, reports, moderators, consistency
    auth/                  signup, signin, password, tokens, email, username, refresh
    stories/               catalog, writer, item, drafts, edit-requests, prompts
    hubs/
      applications.js
      chat.js
      content.js
      creator-applications.js
      management/          catalog, item, members
      membership/          join, members
    social/                bookmarks, follows, notifications, reactions, leaderboards
    users/                 profile, preferences, sessions (logout + read tracking)
    threads/
    moderation/            reports, pins, timeouts, chat, appeals
    platform/              uploads, translate, transparency
```

When a route file exceeds 400 lines, split inside its domain folder with an `index.js` that `router.use`s the pieces. `server.js` requires the folder (`./routes/stories` → `stories/index.js`).

## Naming

Prefer the job in the name:

| Avoid | Prefer |
| --- | --- |
| `auth-consolidated.js` | `middleware/auth.js` |
| `api.js` (everything) | `api/stories.js`, `api/hubs.js` |
| `sessions.js` mixing reads + logout | keep logout in `auth`, reads in `reads` when you next touch it |
| `Leaderboard.jsx` vs `Leaderboards.jsx` | widget vs full page — both live in `leaderboard/` |

## Checklist before merging a large change

- [ ] No new file over the must-split line
- [ ] New endpoints landed in a domain API file
- [ ] New screens landed in the matching `components/<domain>/` folder
- [ ] Route wrappers did not grow `App.jsx`
- [ ] `npm run build --workspace frontend` still passes
- [ ] Barrel files only re-export — they do not accumulate logic
