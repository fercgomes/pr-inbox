import posthog from "posthog-js";

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (apiKey) {
  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://boo.prinbox.dev",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com",
    defaults: "2026-05-30",
    person_profiles: "identified_only",
  });
}
