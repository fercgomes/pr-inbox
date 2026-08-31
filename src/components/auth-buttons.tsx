"use client";

import { signIn, signOut } from "next-auth/react";
import posthog from "posthog-js";

export function SignInButton() {
  return (
    <button
      className="border-2 border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-semibold text-[#f4f2eb] hover:bg-[#f4f2eb] hover:text-zinc-950"
      onClick={() => signIn("github")}
    >
      Sign in with GitHub
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      className="border border-current px-3 py-1.5 text-sm font-medium hover:bg-[#f4f2eb] hover:text-zinc-950"
      onClick={() => {
        posthog.reset();
        signOut();
      }}
    >
      Sign out
    </button>
  );
}
