import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: "Sign in to view pull request diffs." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const repository = searchParams.get("repository");
  const number = Number(searchParams.get("number"));

  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !Number.isInteger(number) || number < 1) {
    return Response.json({ error: "The pull request is invalid." }, { status: 400 });
  }

  const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${number}`, {
    headers: {
      Accept: "application/vnd.github.diff",
      Authorization: `Bearer ${session.accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return Response.json({ error: "GitHub could not load the pull request diff." }, { status: response.status });
  }

  return new Response(await response.text(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
