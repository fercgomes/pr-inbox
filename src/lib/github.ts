export type CheckCounts = {
  total: number;
  running: number;
  failed: number;
  successful: number;
};

export type PullRequest = {
  id: string;
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  additions: number;
  deletions: number;
  comments: number;
  checks: CheckCounts;
  repository_url: string;
  user: { login: string; avatar_url: string };
};

type SearchPullRequest = PullRequest & { head_sha: string | null };
type GithubUser = { login: string };
type CheckRun = { status: string; conclusion: string | null };
type CheckRunsResponse = { check_runs: CheckRun[] };
type PullRequestDetail = Pick<PullRequest, "additions" | "deletions" | "comments"> & { head: { sha: string } };
type GraphqlResponse<T> = { data?: T };
type GraphqlPullRequest = Omit<SearchPullRequest, "repository_url" | "comments" | "checks" | "head_sha"> & {
  comments: { totalCount: number };
  repository: { nameWithOwner: string };
  commits: { nodes: { commit: { oid: string } }[] };
};
type GraphqlSearchResponse = { search: { nodes: GraphqlPullRequest[] } };
type RestPullRequest = Pick<
  PullRequest,
  "number" | "title" | "html_url" | "created_at" | "updated_at" | "comments" | "repository_url" | "user"
> & {
  id: number;
  pull_request: { url: string };
};
type RestSearchResponse = { items: RestPullRequest[] };

const emptyChecks: CheckCounts = { total: 0, running: 0, failed: 0, successful: 0 };

const searchPullRequestsQuery = `
  query SearchPullRequests($query: String!) {
    search(query: $query, type: ISSUE, first: 100) {
      nodes {
        ... on PullRequest {
          id
          number
          title
          html_url: url
          created_at: createdAt
          updated_at: updatedAt
          additions
          deletions
          comments {
            totalCount
          }
          commits(last: 1) {
            nodes {
              commit {
                oid
              }
            }
          }
          repository {
            nameWithOwner
          }
          user: author {
            login
            avatar_url: avatarUrl
          }
        }
      }
    }
  }
`;

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

async function graphql<T>(query: string, variables: Record<string, string>, token: string): Promise<T> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const body = await response.text();
  let result: GraphqlResponse<T>;

  try {
    result = JSON.parse(body) as GraphqlResponse<T>;
  } catch {
    throw new Error(`GitHub GraphQL request failed (${response.status}).`);
  }

  if (!response.ok || !result.data) {
    throw new Error(`GitHub GraphQL request failed (${response.status}).`);
  }

  return result.data;
}

async function inBatches<T, R>(items: T[], action: (item: T) => Promise<R>) {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += 10) {
    results.push(...(await Promise.all(items.slice(index, index + 10).map(action))));
  }

  return results;
}

async function restSearch(query: string, token: string): Promise<SearchPullRequest[]> {
  const params = new URLSearchParams({ q: query, per_page: "100", sort: "updated", order: "desc" });
  const result = await github<RestSearchResponse>(`/search/issues?${params}`, token);

  const pullRequests = result.items.map(({ pull_request, ...pullRequest }) => ({
    ...pullRequest,
    id: String(pullRequest.id),
    additions: 0,
    deletions: 0,
    checks: emptyChecks,
    head_sha: null,
    pull_request_url: pull_request.url,
  }));

  return inBatches(pullRequests, async ({ pull_request_url, ...pullRequest }) => {
    try {
      const path = new URL(pull_request_url).pathname;
      const detail = await github<PullRequestDetail>(path, token);

      return { ...pullRequest, ...detail, head_sha: detail.head.sha };
    } catch {
      return pullRequest;
    }
  });
}

async function search(query: string, token: string): Promise<SearchPullRequest[]> {
  try {
    const result = await graphql<GraphqlSearchResponse>(searchPullRequestsQuery, { query: `${query} sort:updated-desc` }, token);

    return result.search.nodes
      .map(({ repository, comments, commits, ...pullRequest }) => ({
        ...pullRequest,
        comments: comments.totalCount,
        checks: emptyChecks,
        head_sha: commits.nodes[0]?.commit.oid ?? null,
        repository_url: `https://api.github.com/repos/${repository.nameWithOwner}`,
      }))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  } catch {
    return restSearch(query, token);
  }
}

async function getChecks(repositoryUrl: string, sha: string, token: string): Promise<CheckCounts> {
  const checks: CheckRun[] = [];

  for (let page = 1; ; page += 1) {
    const path = `${repositoryUrl.replace("https://api.github.com", "")}/commits/${sha}/check-runs?per_page=100&page=${page}`;
    const result = await github<CheckRunsResponse>(path, token);
    checks.push(...result.check_runs);

    if (result.check_runs.length < 100) {
      break;
    }
  }

  return checks.reduce(
    (counts, check) => {
      if (check.status !== "completed") {
        counts.running += 1;
      } else if (["success", "neutral", "skipped"].includes(check.conclusion ?? "")) {
        counts.successful += 1;
      } else {
        counts.failed += 1;
      }

      counts.total += 1;
      return counts;
    },
    { ...emptyChecks },
  );
}

async function addCheckCounts(pullRequests: SearchPullRequest[], token: string) {
  const uniquePullRequests = [...new Map(pullRequests.map((pullRequest) => [pullRequest.id, pullRequest])).values()];
  const counts = await inBatches(uniquePullRequests, async (pullRequest) => {
    if (!pullRequest.head_sha) {
      return [pullRequest.id, emptyChecks] as const;
    }

    try {
      return [pullRequest.id, await getChecks(pullRequest.repository_url, pullRequest.head_sha, token)] as const;
    } catch {
      return [pullRequest.id, emptyChecks] as const;
    }
  });
  const checksById = new Map(counts);

  return pullRequests.map((pullRequest) => ({
    ...pullRequest,
    checks: checksById.get(pullRequest.id) ?? emptyChecks,
  }));
}

export type Inbox = {
  awaitingReview: PullRequest[];
  returnedToYou: PullRequest[];
  awaitingApproval: PullRequest[];
  approved: PullRequest[];
  drafts: PullRequest[];
  merged: PullRequest[];
};

export async function getInbox(token: string): Promise<Inbox> {
  const user = await github<GithubUser>("/user", token);
  const author = `author:${user.login}`;
  const [awaitingReview, returnedToYou, awaitingApproval, approved, drafts, merged] = await Promise.all([
    search(`is:open is:pr review-requested:${user.login} review:none -draft:true`, token),
    search(`is:open is:pr ${author} review:changes_requested`, token),
    search(`is:open is:pr ${author} review:required`, token),
    search(`is:open is:pr ${author} review:approved -draft:true`, token),
    search(`is:open is:pr ${author} draft:true`, token),
    search(`is:merged is:pr ${author}`, token),
  ]);
  const pullRequests = await addCheckCounts(
    [...awaitingReview, ...returnedToYou, ...awaitingApproval, ...approved, ...drafts, ...merged],
    token,
  );
  const checksById = new Map(pullRequests.map((pullRequest) => [pullRequest.id, pullRequest]));
  const attachChecks = (items: SearchPullRequest[]) => items.map((item) => checksById.get(item.id)!);

  return {
    awaitingReview: attachChecks(awaitingReview),
    returnedToYou: attachChecks(returnedToYou),
    awaitingApproval: attachChecks(awaitingApproval),
    approved: attachChecks(approved),
    drafts: attachChecks(drafts),
    merged: attachChecks(merged),
  };
}

export function repositoryName(url: string) {
  return url.replace("https://api.github.com/repos/", "");
}
