export type PullRequest = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  updated_at: string;
  repository_url: string;
  user: { login: string };
};

export type Inbox = {
  awaitingReview: PullRequest[];
  returnedToYou: PullRequest[];
  awaitingApproval: PullRequest[];
  drafts: PullRequest[];
  merged: PullRequest[];
};

type GithubUser = { login: string };
type SearchResponse = { items: PullRequest[] };

async function github<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

async function search(query: string, token: string) {
  const params = new URLSearchParams({
    q: query,
    per_page: "100",
    sort: "updated",
    order: "desc",
  });

  const result = await github<SearchResponse>(`/search/issues?${params}`, token);
  return result.items;
}

export async function getInbox(token: string): Promise<Inbox> {
  const user = await github<GithubUser>("/user", token);
  const author = `author:${user.login}`;

  const [awaitingReview, returnedToYou, awaitingApproval, drafts, merged] =
    await Promise.all([
      search(`is:open is:pr review-requested:${user.login} review:none -draft:true`, token),
      search(`is:open is:pr ${author} review:changes_requested`, token),
      search(`is:open is:pr ${author} review:required`, token),
      search(`is:open is:pr ${author} draft:true`, token),
      search(`is:merged is:pr ${author}`, token),
    ]);

  return { awaitingReview, returnedToYou, awaitingApproval, drafts, merged };
}

export function repositoryName(url: string) {
  return url.replace("https://api.github.com/repos/", "");
}
