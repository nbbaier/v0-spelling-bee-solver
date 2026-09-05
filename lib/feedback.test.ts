import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFeedback } from "./feedback";
import { redis } from "./redis";

vi.mock("./redis", () => ({ redis: { eval: vi.fn() } }));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("GITHUB_FEEDBACK_TOKEN", "test-server-token");
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(redis.eval).mockResolvedValue(1);
  fetchMock.mockResolvedValue(Response.json({ number: 42 }, { status: 201 }));
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("feedback issue creation", () => {
  it("posts trimmed feedback to the fixed repository with needs-triage and returns its link", async () => {
    const result = await createFeedback(
      " A bug ",
      " Steps to reproduce\nMore details "
    );
    expect(result).toEqual({
      ok: true,
      url: "https://github.com/nbbaier/v0-spelling-bee-solver/issues/42",
    });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "https://api.github.com/repos/nbbaier/v0-spelling-bee-solver/issues",
      expect.objectContaining({
        body: JSON.stringify({
          body: "Steps to reproduce\nMore details\n\n---\nSubmitted through the app feedback widget.",
          labels: ["needs-triage"],
          title: "A bug",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer test-server-token",
        }),
        method: "POST",
      })
    );
  });

  it.each([
    [null, "Details"],
    ["Title", null],
    ["   ", "Details"],
    ["Title", "\n "],
    ["x".repeat(121), "Details"],
    ["Title", "x".repeat(5001)],
    [new Blob(["Title"]), "Details"],
  ])(
    "rejects invalid input without contacting Redis or GitHub (%s)",
    async (title, description) => {
      expect(await createFeedback(title, description)).toMatchObject({
        ok: false,
      });
      expect(redis.eval).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("accepts the maximum title and description lengths", async () => {
    expect(
      await createFeedback("x".repeat(120), "x".repeat(5000))
    ).toMatchObject({ ok: true });
  });

  it("reports missing configuration without contacting services", async () => {
    vi.stubEnv("GITHUB_FEEDBACK_TOKEN", "");
    expect(await createFeedback("Title", "Details")).toMatchObject({
      error: expect.stringContaining("not configured"),
      ok: false,
    });
    expect(redis.eval).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows the twentieth attempt and blocks further attempts", async () => {
    vi.mocked(redis.eval).mockResolvedValueOnce(20).mockResolvedValueOnce(21);
    expect(await createFeedback("Title", "Details")).toMatchObject({
      ok: true,
    });
    expect(await createFeedback("Title", "Details")).toMatchObject({
      error: expect.stringContaining("in an hour"),
      ok: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the shared rate limiter is unavailable", async () => {
    vi.mocked(redis.eval).mockRejectedValue(new Error("Redis unavailable"));
    expect(await createFeedback("Title", "Details")).toMatchObject({
      ok: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403, 422, 429, 500])(
    "handles GitHub status %s without leaking its response or retrying",
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json({ message: "sensitive upstream details" }, { status })
      );
      const result = await createFeedback("Title", "Details");
      expect(result).toMatchObject({ ok: false });
      expect(JSON.stringify(result)).not.toContain("sensitive");
      expect(JSON.stringify(result)).not.toContain("test-server-token");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it("warns about uncertain delivery on network failure without retrying", async () => {
    fetchMock.mockRejectedValue(new Error("Timeout"));
    expect(await createFeedback("Title", "Details")).toMatchObject({
      error: expect.stringContaining("before retrying"),
      ok: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not claim success for a malformed GitHub response", async () => {
    fetchMock.mockResolvedValue(Response.json({ number: "42" }));
    expect(await createFeedback("Title", "Details")).toMatchObject({
      ok: false,
    });
  });
});
