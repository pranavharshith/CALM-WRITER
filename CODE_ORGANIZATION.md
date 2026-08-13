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

## Where things live

### Frontend

```
frontend/src/
  api/                 HTTP client + one file per domain
    client.js          fetch, CSRF, tokens, logout  — no endpoints
    stories.js         feed, like, search, featured
    hubs.js, auth.js, users.js, drafts.js, threads.js, social.js, …
    api.js             barrel (legacy import path)
  styles/              CSS sections imported by index.css (tokens, feed, …)
  routes/              URL param wrappers (StoryReaderRoute, HubDetailRoute, …)
  components/
    feed/              CommunityFeed header + sidebar
    hub/               HubDetail tabs
    thread/            ThreadView cards / compose / report
    auth/              Auth forms
    admin/             Admin dashboard pages
    moderation/        ModerationDashboard panels
    skeletons/         placeholders by story / page / hub / widget
  hooks/               one hook per file
```

- New API functions go in the matching `api/*.js` file. **Never** add endpoints to `client.js` or grow `api.js`.
- New full-page skeletons go in `skeletons/pageSkeletons.jsx` (or a new group file if that one is full).
- New routed screens: page in `components/`, wrapper in `routes/` if it needs params or auth preload.

### Backend

```
backend/routes/
  stories/             catalog.js, writer.js, item.js
  stories.js           barrel → ./stories/index
  auth/                signup, signin, password, tokens, email, username
  auth.js              barrel → ./auth/index
  admin/               stats, reports, moderators, consistency
  admin.js             barrel
  moderation/          reports, pins, timeouts, chat, appeals
  moderation.js        barrel
  hub-management/      catalog, item, members
  hub-membership/      join, members
```

When a route file exceeds 400 lines, make `routes/<domain>/` with an `index.js` that `router.use`s the pieces. Keep the old `routes/<domain>.js` as `module.exports = require('./<domain>')` so `server.js` does not change.

## Naming

Prefer the job in the name:

| Avoid | Prefer |
| --- | --- |
| `auth-consolidated.js` | `middleware/auth.js` (alias exists) |
| `api.js` (everything) | `api/stories.js`, `api/hubs.js` |
| `sessions.js` mixing reads + logout | keep logout in `auth`, reads in `reads` when you next touch it |
| `Leaderboard.jsx` vs `Leaderboards.jsx` | widget vs full page — see aliases below |

Existing aliases (import either name):

- `backend/middleware/auth.js` → `auth-consolidated.js`
- `frontend/src/components/LeaderboardWidget.jsx` → sidebar `Leaderboard.jsx`
- `frontend/src/components/HubsDirectory.jsx` → `CollaborativeHubs.jsx`

## Checklist before merging a large change

- [ ] No new file over the must-split line
- [ ] New endpoints landed in a domain API file
- [ ] Route wrappers did not grow `App.jsx`
- [ ] `npm run build --workspace frontend` still passes
- [ ] Barrel files only re-export — they do not accumulate logic
