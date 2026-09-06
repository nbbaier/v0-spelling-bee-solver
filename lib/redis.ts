import { Redis } from "@upstash/redis";

/** Shared Upstash Redis client, configured from `KV_REST_API_*` env vars. */
export const redis = new Redis({
  token: process.env.KV_REST_API_TOKEN,
  url: process.env.KV_REST_API_URL,
});
