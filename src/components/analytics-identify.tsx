"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

type AnalyticsIdentifyProps = {
  userId?: string;
  name?: string | null;
};

type AnalyticsInboxViewedProps = {
  pullRequestCount: number;
  sectionCounts: Record<string, number>;
};

export function AnalyticsIdentify({ userId, name }: AnalyticsIdentifyProps) {
  useEffect(() => {
    if (userId) {
      analytics.identify(userId, name ? { name } : undefined);
    }
  }, [name, userId]);

  return null;
}

export function AnalyticsInboxViewed({ pullRequestCount, sectionCounts }: AnalyticsInboxViewedProps) {
  useEffect(() => {
    analytics.capture("inbox_viewed", { platform: "web", pull_request_count: pullRequestCount, ...sectionCounts });
  }, [pullRequestCount, sectionCounts]);

  return null;
}
