import * as amplitude from "@amplitude/unified";
import mixpanel from "mixpanel-browser";
import posthog from "posthog-js";

type AnalyticsProperties = Record<string, boolean | number | string>;

type AnalyticsClient = {
  capture: (event: string, properties?: AnalyticsProperties) => void;
  identify: (userId: string, properties?: AnalyticsProperties) => void;
  reset: () => void;
};

const clients: AnalyticsClient[] = [];
let initialized = false;

function run(operation: (client: AnalyticsClient) => void) {
  clients.forEach((client) => {
    try {
      operation(client);
    } catch {
      return;
    }
  });
}

export const analytics = {
  init() {
    if (initialized) {
      return;
    }

    initialized = true;

    const amplitudeKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

    if (!amplitudeKey) {
      console.warn("Amplitude API key missing — analytics disabled");
    } else {
      void amplitude.initAll(amplitudeKey, { analytics: { autocapture: true }, sessionReplay: { sampleRate: 1 } });
      clients.push({
        capture: (event, properties) => amplitude.track(event, { ...properties, prompt_version: "BA400.4" }),
        identify: (userId, properties) => {
          amplitude.setUserId(userId);
          if (properties) {
            const identify = new amplitude.Identify();
            Object.entries(properties).forEach(([key, value]) => identify.set(key, value));
            amplitude.identify(identify);
          }
        },
        reset: () => amplitude.reset(),
      });
    }

    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://boo.prinbox.dev",
        ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com",
        defaults: "2026-05-30",
        person_profiles: "identified_only",
      });
      clients.push({
        capture: (event, properties) => posthog.capture(event, properties),
        identify: (userId, properties) => posthog.identify(userId, properties),
        reset: () => posthog.reset(),
      });
    }

    if (mixpanelToken) {
      mixpanel.init(mixpanelToken, { autocapture: false, track_pageview: false });
      clients.push({
        capture: (event, properties) => mixpanel.track(event, properties),
        identify: (userId, properties) => {
          mixpanel.identify(userId);
          if (properties) {
            mixpanel.people.set(properties);
          }
        },
        reset: () => mixpanel.reset(),
      });
    }
  },
  capture(event: string, properties?: AnalyticsProperties) {
    run((client) => client.capture(event, properties));
  },
  identify(userId: string, properties?: AnalyticsProperties) {
    run((client) => client.identify(userId, properties));
  },
  reset() {
    run((client) => client.reset());
  },
};
