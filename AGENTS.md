<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Analytics

Use `src/lib/analytics.ts` for browser analytics. It sends identical `init`, `identify`, `capture`, and `reset` calls to configured providers.

The active providers are Amplitude, Contentsquare, PostHog, Mixpanel, Statsig, and LaunchDarkly. Do not import provider SDKs outside this wrapper.

Amplitude uses `NEXT_PUBLIC_AMPLITUDE_API_KEY`. It initializes browser analytics, autocapture, and session replay in `analytics.init()`.

Mixpanel uses `NEXT_PUBLIC_MIXPANEL_TOKEN`. Simplified ID Merge is assumed to be enabled in the configured project.

Statsig uses `NEXT_PUBLIC_STATSIG_CLIENT_KEY`. It initializes session replay and web analytics in `analytics.init()`.

LaunchDarkly uses `NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID`. It initializes with a persistent anonymous context and identifies signed-in users with the GitHub provider account ID.

Contentsquare uses tag ID `c15bb69ebd017`. It initializes in `analytics.init()`.

Identify users with the stable GitHub provider account ID. Do not identify with an email address. Call `analytics.reset()` before sign-out.

Read `ANALYTICS.md` before you add or change events. Use snake_case event and property names. Do not send personal data in event properties.
