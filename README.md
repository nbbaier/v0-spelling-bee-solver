# Spelling Bee Solver

An interactive solver for the [New York Times Spelling Bee](https://www.nytimes.com/games/spelling-bee) word puzzle game. Paste a puzzle and get hints, track progress, and manage multiple puzzles by date.

## Features

- **Smart hint system**: Get word hints organized by first letter and length
- **Progress tracking**: See which words you've found and which remain
- **Date navigation**: Load and switch between different daily puzzles
- **Persistent storage**: Automatically save your progress
- **Today's puzzle**: Quick-load the latest puzzle
- **Feedback**: Send a bug report or suggestion from the app as a GitHub issue

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+ (or npm/yarn)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

### Feedback setup

The **Send feedback** button opens a popup on every page. Submitting creates a public issue in `nbbaier/v0-spelling-bee-solver` with the `needs-triage` label and returns a link to the issue. Feedback text is preserved when a submission fails or the popup is closed.

Set these server-side environment variables in `.env.local` for local development and in your hosting environment for deployment:

- `GITHUB_FEEDBACK_TOKEN`: a fine-grained GitHub token scoped to this repository with **Issues: Read and write** permission. The token's owner must have sufficient repository access to apply labels. Never use a `NEXT_PUBLIC_` variable for this token.
- `KV_REST_API_URL` and `KV_REST_API_TOKEN`: the existing Upstash Redis connection, also used to limit feedback submissions.

Ensure the `needs-triage` label exists before enabling feedback. The server fixes the repository and label; the browser sends only the title and description. No page URL, room identifier, or browser metadata is collected. Next.js Server Actions provide same-origin checks and the default request body size limit.

The public submission endpoint allows at most 20 GitHub creation attempts per hour across the app, using an atomic Redis counter. This bounds anonymous issue creation across server instances; it is not user authentication. If Redis is unavailable, submissions fail closed. Missing GitHub configuration and service failures appear in the popup. Requests are never automatically retried because a timeout may occur after GitHub has created the issue.

GitHub API reference: [Create an issue](https://docs.github.com/en/rest/issues/issues#create-an-issue).

This project uses [Ultracite](https://github.com/biomejs/biome) for code quality and formatting.

- **Check code**: `pnpm lint`
- **Format code**: `pnpm fix`
- **Build for production**: `pnpm build`
- **Run production build**: `pnpm start`

## Project Structure

- `app/` - Next.js app routes and layouts
- `components/` - React components for UI
- `lib/` - Solver logic, puzzle parsing, and utilities
- `hooks/` - Custom React hooks for state management

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [TypeScript](https://www.typescriptlang.org) - Type safety
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [SWR](https://swr.vercel.app) - Data fetching
- [Upstash Redis](https://upstash.com) - Puzzle storage
