# Unified Studio feature branch

Pair this frontend with `offers-png/clipper-api-final` branch `feature/unified-studios-20261025`. Existing Original ClipForge login, editor, history and billing UI source remains unchanged. Only the entry import is routed through an opt-in wrapper; the default build still opens the original application.

When enabled, `/workspace/auto`, `/workspace/transcript`, `/workspace/thumbnails` and `/workspace/editor` share one navigation. The Original tab opens the real existing `/clipper` route and its unchanged auth guard. Video Editor and Image-to-Video are tools within the Original local companion, not another standalone application. Frames retain their state while switching Studio sections.

New public build variables (no secret API values):

- `VITE_ENABLE_STUDIOS=true` opts into the new navigation; default false.
- `VITE_STUDIOS_API_BASE=http://localhost:5175/studios-api` explicitly selects the local prefixed API. No production URL is guessed.
- `VITE_STUDIOS_LOCAL_ONLY=true` is for credential-free local tool testing only. Default false reuses the original ProtectedRoute for Studio pages; it does not change the original login/editor guard.

Existing `VITE_API_BASE`, `VITE_SUPABASE_URL` and public `VITE_SUPABASE_ANON_KEY` names remain unchanged. No private key belongs in a `VITE_*` variable.

For local testing set the three Studio values above in an ignored `.env.local`, run `npm ci` if dependencies are missing, then `npm run build` and `npm run preview -- --host localhost --port 5174`. Open http://localhost:5174/workspace/auto. The original application still requires its normal Supabase configuration; authenticated cloud features were intentionally not invoked offline.

The additive public Studio assets include real transcript selection, Auto clips, the manual 1–5 companion, FFmpeg timeline editor, Thumbnail Studio and unavailable-provider interfaces. Media requests use the explicitly configured API; existing original integrations are not redirected or edited. Real image/video synthesis remains awaiting a selected provider; reference frames are labelled accurately.

Both default and opt-in Vite builds passed with the existing installed dependencies. Backend actual-video regression tests passed against the paired package. Build warnings concerned existing module metadata and outdated browser-support data; no dependency updates were performed.

Browser checks on the built frontend verified the configured API prefix, real Auto uploads/generation, editor handoff with retained state, actual three-concept thumbnail analysis, editable layers and valid PNG/JPEG exports. A legacy XMLHttpRequest upload path was corrected in the additive bridge. Existing original App/auth/editor/dashboard files remain unchanged; protected cloud behavior was not exercised offline.

`.env` variants, dependencies, dist files, models and credentials are excluded. This is a feature branch for review, not approval to enable Studios in Render. See the paired backend's `STUDIOS_INTEGRATION.md` for tests, adapter configuration and remaining production work.
