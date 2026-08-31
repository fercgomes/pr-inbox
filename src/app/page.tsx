import { getServerSession } from "next-auth";
import { SignInButton, SignOutButton } from "@/components/auth-buttons";
import { CollapsibleSection } from "@/components/collapsible-section";
import { DiffButton } from "@/components/diff-button";
import { PostHogIdentify } from "@/components/posthog-identify";
import { authOptions } from "@/lib/auth";
import { getInbox, repositoryName, type PullRequest } from "@/lib/github";

export const dynamic = "force-dynamic";

const sections = [
  ["01", "Awaiting your review", "No reviews yet.", "awaitingReview", "bg-[#d8ff48]"],
  ["02", "Returned to you", "Changes requested.", "returnedToYou", "bg-[#ff8c69]"],
  ["03", "Awaiting approval", "Your work needs a review.", "awaitingApproval", "bg-[#8ac8ff]"],
  ["04", "Drafts", "Open drafts.", "drafts", "bg-[#d5b6ff]"],
  ["05", "Merged", "Recently merged.", "merged", "bg-[#7ee2ba]"],
] as const;

function PullRequestList({ pullRequests }: { pullRequests: PullRequest[] }) {
  if (pullRequests.length === 0) {
    return <p className="border-t-2 border-zinc-950 bg-white px-5 py-6 font-mono text-xs text-zinc-500">Nothing here.</p>;
  }

  return (
    <ul className="border-t-2 border-zinc-950 bg-white">
      {pullRequests.map((pullRequest) => {
        const repository = repositoryName(pullRequest.repository_url);

        return (
          <li key={pullRequest.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-4 border-b border-zinc-200 px-5 py-4 last:border-b-0">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center bg-zinc-950 font-mono text-xs font-bold text-[#f4f2eb]">
              #{pullRequest.number}
            </span>
            <a className="min-w-0" href={pullRequest.html_url} rel="noreferrer" target="_blank">
              <p className="truncate font-semibold text-zinc-950 hover:underline">{pullRequest.title}</p>
              <p className="mt-1 truncate font-mono text-xs text-zinc-500">
                {repository} / {pullRequest.user.login}
              </p>
            </a>
            <div className="self-center">
              <DiffButton number={pullRequest.number} repository={repository} title={pullRequest.title} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f2eb] p-6 text-zinc-950">
        <div className="w-full max-w-xl border-2 border-zinc-950 bg-[#d8ff48] p-8 sm:p-12">
          <p className="font-mono text-sm font-bold">PR / INBOX</p>
          <h1 className="mt-10 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">Review your code.</h1>
          <p className="mt-6 max-w-sm text-lg leading-7">Sign in to read your GitHub pull request queue.</p>
          <div className="mt-10">
            <SignInButton />
          </div>
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
      <main className="grid min-h-screen place-items-center bg-[#f4f2eb] p-6 text-zinc-950">
        <div className="w-full max-w-xl border-2 border-zinc-950 bg-[#ff8c69] p-8 sm:p-12">
          <p className="font-mono text-sm font-bold">PR / INBOX</p>
          <h1 className="mt-10 text-4xl font-semibold tracking-[-0.04em]">GitHub data could not load.</h1>
          <p className="mt-4 max-w-md leading-6">{errorMessage}</p>
          <div className="mt-10">
            <SignOutButton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f2eb] text-zinc-950 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <PostHogIdentify email={session.user?.email} name={session.user?.name} />
      <aside className="flex flex-col justify-between bg-zinc-950 p-6 text-[#f4f2eb] lg:sticky lg:top-0 lg:h-screen lg:self-start">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-zinc-400">PULL REQUESTS</p>
          <p className="mt-4 text-6xl font-semibold tracking-[-0.08em]">PR</p>
          <p className="text-3xl font-semibold tracking-[-0.06em]">Inbox</p>
        </div>
        <div className="mt-16 border-t border-zinc-700 pt-5 lg:mt-0">
          <p className="font-mono text-xs text-zinc-500">SIGNED IN AS</p>
          <p className="mt-2 truncate font-medium">{session.user?.name ?? "GitHub user"}</p>
          <div className="mt-5">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="p-4 sm:p-8 lg:p-12">
        <header className="flex items-end justify-between border-b-2 border-zinc-950 pb-5">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.16em]">YOUR QUEUE</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">Pull requests</h1>
          </div>
          <p className="hidden max-w-36 text-right font-mono text-xs leading-5 text-zinc-500 sm:block">
            GitHub review states, grouped for triage.
          </p>
        </header>

        <div className="mt-8 space-y-4">
          {sections.map(([index, title, description, key, color]) => (
            <CollapsibleSection
              key={key}
              color={color}
              count={inbox[key].length}
              defaultOpen={key !== "drafts" && key !== "merged"}
              description={description}
              index={index}
              title={title}
            >
              <PullRequestList pullRequests={inbox[key]} />
            </CollapsibleSection>
          ))}
        </div>
      </div>
    </main>
  );
}
