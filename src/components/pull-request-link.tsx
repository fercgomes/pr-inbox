"use client";

import type { ReactNode } from "react";
import { analytics } from "@/lib/analytics";

type PullRequestLinkProps = {
  children: ReactNode;
  href: string;
  pullRequestState: string;
  repository: string;
};

export function PullRequestLink({ children, href, pullRequestState, repository }: PullRequestLinkProps) {
  return (
    <a
      className="min-w-0"
      href={href}
      rel="noreferrer"
      target="_blank"
      onClick={() => analytics.capture("pull_request_opened", { pull_request_state: pullRequestState, repository })}
    >
      {children}
    </a>
  );
}
