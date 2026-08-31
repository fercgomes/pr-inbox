"use client";

import { useRef, useState } from "react";
import { DiffView } from "@/components/diff-view";

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
    dialog.current?.showModal();
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch(
        `/api/pull-requests/diff?repository=${encodeURIComponent(repository)}&number=${number}`,
      );

      if (!response.ok) {
        throw new Error();
      }

      setDiff(await response.text());
    } catch {
      setError("GitHub could not load the pull request diff.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        onClick={openDiff}
      >
        View diff
      </button>
      <dialog
        ref={dialog}
        className="fixed inset-0 m-auto flex max-h-[90vh] w-[min(96vw,1100px)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-black/30"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900">{title}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {repository} #{number}
            </p>
          </div>
          <form method="dialog">
            <button className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              Close
            </button>
          </form>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-zinc-950">
          {loading && <p className="p-5 font-mono text-sm text-zinc-300">Loading diff...</p>}
          {error && <p className="p-5 font-mono text-sm text-rose-300">{error}</p>}
          {diff && !loading && <DiffView diff={diff} />}
        </div>
      </dialog>
    </>
  );
}
