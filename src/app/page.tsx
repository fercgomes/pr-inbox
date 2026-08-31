import { getServerSession } from "next-auth";
import { SignInButton, SignOutButton } from "@/components/auth-buttons";
import { DiffButton } from "@/components/diff-button";
import { authOptions } from "@/lib/auth";
import { getInbox, repositoryName, type PullRequest } from "@/lib/github";

export const dynamic = "force-dynamic";

const sections = [
  ["Awaiting your review", "No one has reviewed these yet.", "awaitingReview", "bg-amber-50 text-amber-900"],
  ["Returned to you", "Changes were requested.", "returnedToYou", "bg-rose-50 text-rose-900"],
  ["Awaiting approval", "Your pull requests need a review.", "awaitingApproval", "bg-sky-50 text-sky-900"],
  ["Drafts", "Your open draft pull requests.", "drafts", "bg-violet-50 text-violet-900"],
  ["Merged", "Your recently merged pull requests.", "merged", "bg-emerald-50 text-emerald-900"],
] as const;

function PullRequestList({ pullRequests }: { pullRequests: PullRequest[] }) {
  if (pullRequests.length === 0) {
    return <p className="px-5 py-5 text-sm text-zinc-500">None.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-100 px-5">
      {pullRequests.map((pullRequest) => (
        <li key={pullRequest.id} className="flex items-center justify-between gap-4 py-4">
          <a
            className="min-w-0 hover:text-zinc-600"
            href={pullRequest.html_url}
            rel="noreferrer"
            target="_blank"
          >
            <p className="font-medium text-zinc-900">{pullRequest.title}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {repositoryName(pullRequest.repository_url)} #{pullRequest.number} · {pullRequest.user.login}
            </p>
          </a>
          <DiffButton
            number={pullRequest.number}
            repository={repositoryName(pullRequest.repository_url)}
            title={pullRequest.title}
          />
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6">
        <p className="text-sm font-medium text-zinc-500">PR Inbox</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
          Your pull requests, in one place.
        </h1>
        <p className="mt-4 text-zinc-600">
          Sign in to view GitHub pull requests that need your attention.
        </p>
        <div className="mt-8">
          <SignInButton />
        </div>
      </main>
    );
  }

  let inbox: Awaited<ReturnType<typeof getInbox>> | null = null;
  let errorMessage: string | null = null;

  try {
    inbox = await getInbox(session.accessToken);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "GitHub data could not load.";
  }

  if (errorMessage || !inbox) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6">
        <p className="text-sm font-medium text-zinc-500">PR Inbox</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          GitHub data could not load.
        </h1>
        <p className="mt-3 text-zinc-600">{errorMessage}</p>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="text-sm font-medium text-zinc-500">PR Inbox</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
            {session.user?.name ?? "Your pull requests"}
          </h1>
        </div>
        <SignOutButton />
      </header>

      <div className="mt-8 space-y-6">
        {sections.map(([title, description, key, tone]) => (
          <details key={key} open className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <summary className={`flex cursor-pointer list-none items-center justify-between px-5 py-4 ${tone}`}>
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-1 text-sm opacity-70">{description}</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-full bg-white/70 text-lg font-semibold">
                {inbox[key].length}
              </span>
            </summary>
            <PullRequestList pullRequests={inbox[key]} />
          </details>
        ))}
      </div>
    </main>
  );
}
