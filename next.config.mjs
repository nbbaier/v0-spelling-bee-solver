/** @type {import('next').NextConfig} */
const nextConfig = {
  // Stop `next dev` appending its agent-rules block to AGENTS.md whenever an
  // AI coding agent starts the dev server.
  agentRules: false,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
