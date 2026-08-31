import Image from "next/image";
import { getServerSession } from "next-auth";
import { SignInButton, SignOutButton } from "@/components/auth-buttons";
import { CollapsibleSection } from "@/components/collapsible-section";
import { DiffButton } from "@/components/diff-button";
import { PostHogIdentify } from "@/components/posthog-identify";
import { authOptions } from "@/lib/auth";
import { getInbox, repositoryName, type PullRequest } from "@/lib/github";

export const dynamic = "force-dynamic";

const sections = [
  ["01", "Awaiting your review", "awaitingReview", "bg-[#d8ff48]"],
  ["02", "Returned to you", "returnedToYou", "bg-[#ff8c69]"],
  ["03", "Awaiting approval", "awaitingApproval", "bg-[#8ac8ff]"],
  ["04", "Drafts", "drafts", "bg-[#d5b6ff]"],
  ["05", "Merged", "merged", "bg-[#7ee2ba]"],
] as const;

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "always" });

function timeSince(timestamp: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 1000));
  const intervals: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const [unit, secondsPerUnit] = intervals.find(([, interval]) => seconds >= interval) ?? ["second", 1];

  return relativeTimeFormatter.format(-Math.floor(seconds / secondsPerUnit), unit);
}

function PullRequestList({ pullRequests }: { pullRequests: PullRequest[] }) {
  if (pullRequests.length === 0) {
    return <p className="border-t-2 border-zinc-950 bg-white px-5 py-6 font-mono text-xs text-zinc-500">Nothing here.</p>;
  }

  return (
    <ul className="border-t-2 border-zinc-950 bg-white">
      {pullRequests.map((pullRequest) => {
        const repository = repositoryName(pullRequest.repository_url);

        return (
          <li key={pullRequest.id} className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] gap-4 border-b border-zinc-200 px-5 py-4 last:border-b-0">
            <span className="mt-0.5 flex h-8 w-16 shrink-0 items-center justify-center bg-zinc-950 px-2 font-mono text-xs font-bold text-[#f4f2eb]">
              #{pullRequest.number}
            </span>
            <Image
              alt=""
              className="mt-0.5 size-8 rounded-full"
              height={32}
              src={pullRequest.user.avatar_url}
              width={32}
            />
            <a className="min-w-0" href={pullRequest.html_url} rel="noreferrer" target="_blank">
              <p className="truncate font-semibold text-zinc-950 hover:underline">{pullRequest.title}</p>
              <p className="mt-1 truncate font-mono text-xs text-zinc-500">
                {repository} / {pullRequest.user.login}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-2 font-mono text-[10px] text-zinc-400">
                <time dateTime={pullRequest.updated_at}>Last updated {timeSince(pullRequest.updated_at)}</time>
                <span className="whitespace-nowrap">
                  <span aria-hidden="true">·</span>{" "}
                  <time dateTime={pullRequest.created_at}>Created {timeSince(pullRequest.created_at)}</time>
                </span>
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
          <p className="font-mono text-xs tracking-[0.2em] text-zinc-400">dead simple pull request inbox</p>
        </div>

        <div className="mt-16 border-t border-zinc-700 pt-5 lg:mt-0">
          <p className="font-mono text-xs text-zinc-500">signed in as</p>
          <p className="mt-2 truncate font-medium">{session.user?.name ?? "GitHub user"}</p>
          <div className="mt-5">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="p-4 sm:p-8 lg:p-12">
        <div className="space-y-4">
          {sections.map(([index, title, key, color]) => (
            <CollapsibleSection
              key={key}
              color={color}
              count={inbox[key].length}
              defaultOpen={key !== "drafts" && key !== "merged"}
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
