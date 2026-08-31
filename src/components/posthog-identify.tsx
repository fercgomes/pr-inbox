"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type PostHogIdentifyProps = {
  email?: string | null;
  name?: string | null;
};

export function PostHogIdentify({ email, name }: PostHogIdentifyProps) {
  useEffect(() => {
    if (email) {
      posthog.identify(email, { name });
    }
  }, [email, name]);

  return null;
}
