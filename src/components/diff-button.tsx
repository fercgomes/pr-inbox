"use client";

import { useRef, useState } from "react";
import { DiffView } from "@/components/diff-view";
import posthog from "posthog-js";

type DiffButtonProps = {
  repository: string;
  number: number;
  title: string;
};

export function DiffButton({ repository, number, title }: DiffButtonProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [diff, setDiff] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function openDiff() {
    posthog.capture("pr_diff_opened", { repository, pull_request_number: number });
    dialog.current?.showModal();
    setLoading(true);
    setDiff(undefined);
    setError(undefined);

    try {
      const response = await fetch(
        `/api/pull-requests/diff?repository=${encodeURIComponent(repository)}&number=${number}`,
      );

      if (!response.ok) {
        throw new Error();
      }

      const nextDiff = await response.text();

      if (!nextDiff) {
        throw new Error();
      }

      setDiff(nextDiff);
    } catch {
      setError("GitHub could not load the pull request diff.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="border border-zinc-950 px-2.5 py-1 font-mono text-xs font-bold text-zinc-950 hover:bg-zinc-950 hover:text-[#f4f2eb]"
        onClick={openDiff}
      >
        View diff
      </button>
      <dialog
        ref={dialog}
        className="fixed top-1/2 left-1/2 m-0 w-[min(96vw,1100px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden border-2 border-zinc-950 bg-[#f4f2eb] p-0 shadow-2xl backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between border-b-2 border-zinc-950 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900">{title}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {repository} #{number}
            </p>
          </div>
          <form method="dialog">
            <button className="border border-zinc-950 px-3 py-1.5 font-mono text-xs font-bold text-zinc-950 hover:bg-zinc-950 hover:text-[#f4f2eb]">
              Close
            </button>
          </form>
        </div>
        <div className="max-h-[calc(90vh-5.25rem)] overflow-auto bg-zinc-950">
          {loading && <p className="p-5 font-mono text-sm text-zinc-300">Loading diff...</p>}
          {error && <p className="p-5 font-mono text-sm text-rose-300">{error}</p>}
          {diff && !loading && <DiffView diff={diff} />}
        </div>
      </dialog>
    </>
  );
}
