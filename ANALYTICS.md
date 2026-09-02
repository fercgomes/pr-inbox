# Analytics Tracking Plan

## Configuration

The application uses direct browser SDKs through `src/lib/analytics.ts`.

- Amplitude uses `NEXT_PUBLIC_AMPLITUDE_API_KEY`.
- PostHog uses `NEXT_PUBLIC_POSTHOG_KEY`.
- Statsig uses `NEXT_PUBLIC_STATSIG_CLIENT_KEY`.
- LaunchDarkly uses `NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID`.
- Contentsquare uses tag ID `c15bb69ebd017`.
- FullStory uses organization ID `o-254697-na1`.
- Plausible loads `https://plausible.io/js/pa-lDCJwGiP_btFc-YfnlcLA.js`.
- Mixpanel uses `NEXT_PUBLIC_MIXPANEL_TOKEN`.
- Mixpanel starts when `NEXT_PUBLIC_MIXPANEL_TOKEN` is set.
- Simplified ID Merge is assumed to be enabled for the configured project.

## Identity

The application identifies signed-in users with the stable GitHub provider account ID. It does not use email as an analytics identifier. It resets each provider before sign-out. Amplitude events include `prompt_version: BA400.4`.

## Events

| Event | Trigger | Properties |
| --- | --- | --- |
| `inbox_viewed` | An authenticated inbox loads successfully. | `platform` string, `pull_request_count` number, `awaiting_review_count` number, `approved_count` number, `awaiting_approval_count` number, `drafts_count` number, `merged_count` number, `returned_to_you_count` number |
| `section_toggled` | A user opens or closes an inbox section. | `section` string, `is_open` boolean |
| `pull_request_opened` | A user opens a GitHub pull request. | `pull_request_state` string, `repository` string |

All event and property names use snake case. Event properties must not contain email addresses, names, tokens, IP addresses, or other personal data.
