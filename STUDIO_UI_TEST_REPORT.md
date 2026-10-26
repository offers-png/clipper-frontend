# Bright Studio UI and preview release

## Focused changes

- Existing routes remain `/clipper` and `/workspace/{auto,transcript,thumbnails,editor}`.
- Pill navigation labels: ClipForge Classic, AI Auto Clips, Text-to-Clip,
  Thumbnail Creator, Video Editor. Icons, current-page states and mobile layout.
- Shared Studio theme uses #F8FAFC/#FFFFFF/#172033/#2563EB and mint accents.
  Canvas artwork colors and existing editing/transcription/rendering logic remain.
- Native dialog preview: 720px maximum width, 80vh/80dvh maximum height, visible
  accessible X, outside-click closing, Esc, focus return and no page navigation.
- Original preview uses the same design; embedded Studio videos get Open preview
  controls. Closing preserves the source form and generated results.
- Capability notices distinguish an absent backend from an available media API
  without local speech/analysis models or a connected generation provider.

## Verification completed before deployment

- 20 frontend tests passed, including preserved deep links, all independently
  loaded Studio documents receiving the shared theme, and billing regressions.
- 76 backend regression tests passed. No backend application source was changed
  for this UI release. Original transcription route tests mock the external paid
  transcription boundary rather than claim a real paid API call.
- Vite build passed. Existing dependency/browser-data warnings remain non-blocking.
- Browser mobile viewport 390x844: all four Studio documents computed body
  background rgb(248,250,252), text rgb(23,32,51), and 390px content width without
  horizontal overflow. Five renamed navigation entries retain their routes.
- Real 20-second local video used for preview checks. Desktop Classic dialog
  measured 720px wide and 615.3px high in a 770px viewport. Mobile Classic dialog
  measured 366.4px wide and 668.8px high in a 390x844 viewport. Both obey 80% height.
- X, Esc and outside-click closing tested. Classic source URL and clip result
  remained on the same page after close. Shared iframe modal also passed X/Esc/
  outside-close checks with real video bytes and returned to the editor.
- Isolated process on Render mounted the actual Studio package: health 200;
  anonymous upload 401. A real 5.055-second MP4 split into three consecutive clips
  with complete coverage, and protected previews/downloads returned 200. Identity
  and billing were fixtures in that private TestClient; no real usage was charged.

## Backend configuration repair

The active service had no `CLIPFORGE_ENABLE_STUDIOS` setting, so the mount was
absent. Existing `/data` storage was already mounted. The only new settings are:

```
CLIPFORGE_ENABLE_STUDIOS=1
CLIPFORGE_STUDIO_DATA_DIR=/data/clipforge-studios
```

No credential, provider key, price, plan, local-only auth bypass or paid-generation
flag was changed. Existing auth/billing/ownership middleware remains in force.

## Limitations to report

The Render service lacks Whisper/Qwen model files and the speech-processing
library. Text-to-Clip transcription, automatic speech captions, AI Highlights and
AI hooks remain unavailable there. Image/video AI generation is not enabled or
claimed successful. No model was downloaded. Full-video splitting without speech
enhancements, manual thumbnail composition and FFmpeg editing can work without
those models. TikTok downloading remains a separately documented unresolved issue.

Live production checks must confirm the frontend revision, media API health,
unauthenticated rejection and accurate capability reporting after deployment.
Full logged-in production generation is not claimed from local fixture tests.
