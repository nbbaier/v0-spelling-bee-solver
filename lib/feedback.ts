import "server-only";

import { redis } from "./redis";

const REPOSITORY = "nbbaier/v0-spelling-bee-solver";
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 5000;
const HOURLY_LIMIT = 20;

/** Outcome of submitting in-app feedback as a GitHub issue. */
export type FeedbackResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], 3600) end
return count
`;

/**
 * Creates a GitHub issue from the feedback widget, rate-limited to
 * 20 submissions per hour.
 *
 * On GitHub errors after the request is sent, does not retry — a timeout can
 * happen after the issue is created.
 *
 * @param title - Issue title; must be a non-empty string of at most 120 characters.
 * @param description - Issue body; must be a non-empty string of at most 5,000 characters.
 */
export async function createFeedback(
  title: unknown,
  description: unknown
): Promise<FeedbackResult> {
  if (
    typeof title !== "string" ||
    typeof description !== "string" ||
    !title.trim() ||
    !description.trim() ||
    title.length > MAX_TITLE_LENGTH ||
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return {
      error:
        "Enter a title (up to 120 characters) and feedback (up to 5,000 characters).",
      ok: false,
    };
  }

  const token = process.env.GITHUB_FEEDBACK_TOKEN;
  if (!token) {
    return {
      error: "Feedback is not configured yet. Please try again later.",
      ok: false,
    };
  }

  try {
    const count = await redis.eval<[], number>(
      RATE_LIMIT_SCRIPT,
      ["feedback:hourly"],
      []
    );
    if (count > HOURLY_LIMIT) {
      return {
        error: "Feedback is busy right now. Please try again in an hour.",
        ok: false,
      };
    }
  } catch {
    return {
      error:
        "Feedback is temporarily unavailable. Your text has been kept; please try again later.",
      ok: false,
    };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPOSITORY}/issues`,
      {
        body: JSON.stringify({
          body: `${description.trim()}\n\n---\nSubmitted through the app feedback widget.`,
          labels: ["needs-triage"],
          title: title.trim(),
        }),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2026-03-10",
        },
        method: "POST",
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!response.ok) {
      return {
        error:
          "GitHub could not accept your feedback. Your text has been kept; please try again later.",
        ok: false,
      };
    }
    const issue: { number?: unknown } = await response.json();
    if (
      typeof issue.number !== "number" ||
      !Number.isSafeInteger(issue.number) ||
      issue.number < 1
    ) {
      throw new Error("Invalid GitHub issue response");
    }
    return {
      ok: true,
      url: `https://github.com/${REPOSITORY}/issues/${issue.number}`,
    };
  } catch {
    return {
      error:
        "We could not confirm whether GitHub received your feedback. Check the repository issues before retrying to avoid a duplicate.",
      ok: false,
    };
  }
}
