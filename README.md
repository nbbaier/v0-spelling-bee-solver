# Spelling Bee Solver

An interactive solver for the [New York Times Spelling Bee](https://www.nytimes.com/games/spelling-bee) word puzzle game. Paste a puzzle and get hints, track progress, and manage multiple puzzles by date.

## Features

- **Smart hint system**: Get word hints organized by first letter and length
- **Progress tracking**: See which words you've found and which remain
- **Date navigation**: Load and switch between different daily puzzles
- **Persistent storage**: Automatically save your progress
- **Today's puzzle**: Quick-load the latest puzzle

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
