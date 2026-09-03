"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export function AnalyticsError({ message }: { message: string }) {
  useEffect(() => {
    analytics.captureMessage(message, { page: "inbox" });
  }, [message]);

  return null;
}
