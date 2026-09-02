import * as amplitude from "@amplitude/unified";
import { injectContentsquareScript } from "@contentsquare/tag-sdk";
import { createClient, type LDContext } from "@launchdarkly/react-sdk";
import { LogLevel, StatsigClient } from "@statsig/react-bindings";
import { StatsigSessionReplayPlugin } from "@statsig/session-replay";
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics";
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

type FullStory = {
  anonymize: () => void;
  event: (name: string, properties?: AnalyticsProperties) => void;
  identify: (userId: string, properties?: AnalyticsProperties) => void;
};

type Plausible = {
  (event: string, options?: { props?: AnalyticsProperties }): void;
  init: () => void;
  q?: [string, { props?: AnalyticsProperties }?][];
};

declare global {
  interface Window {
    FS?: FullStory;
    plausible?: Plausible;
  }
}

function initializeFullStory(): FullStory {
  if (window.FS) {
    return window.FS;
  }

  const script = document.createElement("script");
  script.text = String.raw`!function(m,n,e,t,l,o,g,y){var u,a,f=function(h){return!(h in m)||(m.console&&m.console.log&&m.console.log("FullStory namespace conflict. Please use a different namespace."),!1)}(l);f&&(g=m[l]=function(){var b=function(b,d,j,r){r=r||2;var i,c=/Async$/;return c.test(b)&&(b=b.replace(c,""),"function"==typeof Promise)?new Promise((function(i,c){h(b,d,j,i,c,r)})):h(b,d,j,i,i,r)};function h(h,d,j,r,i,c){return b._api?b._api(h,d,j,r,i,c):(b.q&&b.q.push([h,d,j,r,i,c]),null)}return b.q=[],b}(),y=function(b){function h(h){"function"==typeof h[4]&&h[4](new Error(b))}var d=g.q;if(d){for(var j=0;j<d.length;j++)h(d[j]);d.length=0,d.push=h}},function(){var b="script",d=n.createElement(b);d.async=!0,d.crossOrigin="anonymous",d.src="https://"+t+"?org="+o,d.setAttribute("data-fs-namespace",l),d.onerror=function(){y("Error loading "+t)};var c=n.getElementsByTagName(b)[0];c&&c.parentNode?c.parentNode.insertBefore(d,c):n.head.appendChild(d)}(),function(){function b(){}function h(b,h,d){g(b,h,d,1)}function d(b,d,j){h("setProperties",{type:b,properties:d},j)}function j(b,h){d("user",b,h)}function r(b,h,d){j({uid:b},d),h&&j(h,d)}g.identify=r,g.setUserVars=j,g.identifyAccount=b,g.clearUserCookie=b,g.setVars=d,g.event=function(b,d,j){h("trackEvent",{name:b,properties:d},j)},g.anonymize=function(){r(!1)},g.shutdown=function(){h("shutdown")},g.restart=function(){h("restart")},g.log=function(b,d){h("log",{level:b,msg:d})},g.consent=function(b){h("setIdentity",{consent:!arguments.length||b})}}(),u="fetch",a="XMLHttpRequest",g._w={},g._w[a]=m[a],g._w[u]=m[u],m[u]&&(m[u]=function(){return g._w[u].apply(this,arguments)}),g("init",{env:{orgId:o,host:e,script:t}}),g._v="2.1.0")}(window,document,"fullstory.com","edge.fullstory.com/s/fs.js","FS","o-254697-na1");`;
  document.head.append(script);

  return window.FS!;
}

function initializePlausible(): Plausible {
  const plausible = window.plausible ?? ((event: string, options?: { props?: AnalyticsProperties }) => {
    plausible.q?.push([event, options]);
  }) as Plausible;

  plausible.q ??= [];
  plausible.init ??= () => undefined;
  plausible.init();
  window.plausible = plausible;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://plausible.io/js/pa-lDCJwGiP_btFc-YfnlcLA.js";
  document.head.append(script);

  return plausible;
}

function anonymousLaunchDarklyContext(): LDContext {
  const storedKey = localStorage.getItem("launchdarkly_anonymous_key");
  const key = storedKey ?? crypto.randomUUID();

  if (!storedKey) {
    localStorage.setItem("launchdarkly_anonymous_key", key);
  }

  return { kind: "user", key, anonymous: true };
}

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
    const fullStory = initializeFullStory();
    const plausible = initializePlausible();

    injectContentsquareScript({ clientId: "c15bb69ebd017" });
    clients.push({
      capture: (event, properties) => fullStory.event(event, properties),
      identify: (userId, properties) => fullStory.identify(userId, properties),
      reset: () => fullStory.anonymize(),
    });
    clients.push({
      capture: (event, properties) => plausible(event, { props: properties }),
      identify: () => undefined,
      reset: () => undefined,
    });
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const launchDarklyKey = process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID;
    const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    const statsigKey = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;

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

    if (launchDarklyKey) {
      const launchDarkly = createClient(launchDarklyKey, anonymousLaunchDarklyContext());
      void launchDarkly.start();
      clients.push({
        capture: (event, properties) => launchDarkly.track(event, properties),
        identify: (userId) => void launchDarkly.identify({ kind: "user", key: userId }),
        reset: () => void launchDarkly.identify(anonymousLaunchDarklyContext()),
      });
    }

    if (statsigKey) {
      const statsig = new StatsigClient(statsigKey, {}, {
        logLevel: LogLevel.Debug,
        plugins: [new StatsigSessionReplayPlugin(), new StatsigAutoCapturePlugin()],
      });
      void statsig.initializeAsync();
      clients.push({
        capture: (event, properties) => statsig.logEvent(event, undefined, Object.fromEntries(Object.entries(properties ?? {}).map(([key, value]) => [key, String(value)]))),
        identify: (userId, properties) => statsig.updateUserSync({ userID: userId, custom: properties }),
        reset: () => statsig.updateUserSync({}),
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
