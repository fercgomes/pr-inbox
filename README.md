# PR Inbox

A small Next.js app that lists GitHub pull requests by review state.

## Setup

1. Create a GitHub OAuth App at https://github.com/settings/developers.
2. Set its callback URL to `http://localhost:3000/api/auth/callback/github`.
3. Copy `.env.example` to `.env.local`.
4. Set the GitHub client ID, client secret, and a random NextAuth secret.
5. Run `npm run dev`.

GitHub requests use the `read:user` and `repo` scopes. The `repo` scope lets the app list private pull requests.
