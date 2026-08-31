export type PullRequest = {
  id: string;
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  additions: number;
  deletions: number;
  repository_url: string;
  user: { login: string; avatar_url: string };
};

export type Inbox = {
  awaitingReview: PullRequest[];
  returnedToYou: PullRequest[];
  awaitingApproval: PullRequest[];
  approved: PullRequest[];
  drafts: PullRequest[];
  merged: PullRequest[];
};

type GithubUser = { login: string };
type GraphqlPullRequest = Omit<PullRequest, "repository_url"> & {
  repository: { nameWithOwner: string };
};
type GraphqlResponse<T> = { data?: T };
type SearchResponse = { search: { nodes: GraphqlPullRequest[] } };

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
  const result = (await response.json()) as GraphqlResponse<T>;

  if (!response.ok || !result.data) {
    throw new Error(`GitHub API request failed (${response.status}).`);
  }

  return result.data;
}

async function search(query: string, token: string) {
  const result = await graphql<SearchResponse>(searchPullRequestsQuery, { query: `${query} sort:updated-desc` }, token);

  return result.search.nodes
    .map(({ repository, ...pullRequest }) => ({
      ...pullRequest,
      repository_url: `https://api.github.com/repos/${repository.nameWithOwner}`,
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getInbox(token: string): Promise<Inbox> {
  const user = await github<GithubUser>("/user", token);
  const author = `author:${user.login}`;

  const [awaitingReview, returnedToYou, awaitingApproval, approved, drafts, merged] =
    await Promise.all([
      search(`is:open is:pr review-requested:${user.login} review:none -draft:true`, token),
      search(`is:open is:pr ${author} review:changes_requested`, token),
      search(`is:open is:pr ${author} review:required`, token),
      search(`is:open is:pr ${author} review:approved -draft:true`, token),
      search(`is:open is:pr ${author} draft:true`, token),
      search(`is:merged is:pr ${author}`, token),
    ]);

  return { awaitingReview, returnedToYou, awaitingApproval, approved, drafts, merged };
}

export function repositoryName(url: string) {
  return url.replace("https://api.github.com/repos/", "");
}
