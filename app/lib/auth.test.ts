/**
 * The auth state machine and its input guards. Named for what a user would see,
 * because these are the transitions that look like bugs when they go wrong: a
 * "check your inbox" screen sitting in front of a signed-in app, an error wiping
 * a live session, or a link request that reveals whether an account exists.
 */
import { describe, it, expect } from "vitest";
import {
  nextAuthState,
  normalizeEmail,
  linkCooldownRemaining,
  LINK_COOLDOWN_SECONDS,
  type AuthState,
} from "./auth";

const SIGNED_OUT: AuthState = { status: "signed-out", email: null, userId: null, error: null };
const LINK_SENT: AuthState = { status: "link-sent", email: "sam@example.com", userId: null, error: null };
const SIGNED_IN: AuthState = { status: "signed-in", email: "sam@example.com", userId: "u-1", error: null };

describe("nextAuthState", () => {
  it("a session arriving from another tab wins over a pending link screen", () => {
    const s = nextAuthState(LINK_SENT, { type: "session", userId: "u-1", email: "sam@example.com" });
    expect(s.status).toBe("signed-in");
    expect(s.userId).toBe("u-1");
  });

  it("keeps 'check your inbox' when a session check simply finds nothing", () => {
    // The link has been emailed and not opened yet. Resetting to signed-out here
    // is what made the panel look like the request had failed.
    const s = nextAuthState(LINK_SENT, { type: "no-session" });
    expect(s.status).toBe("link-sent");
    expect(s.email).toBe("sam@example.com");
  });

  it("signs out when a session check finds nothing and no link is outstanding", () => {
    expect(nextAuthState(SIGNED_IN, { type: "no-session" }).status).toBe("signed-out");
  });

  it("an error never destroys a live session", () => {
    const s = nextAuthState(SIGNED_IN, { type: "error", message: "network" });
    expect(s.status).toBe("signed-in");
    expect(s.userId).toBe("u-1");
    expect(s.error).toBe("network");
  });

  it("an error while signed out stays signed out, and never invents a user", () => {
    const s = nextAuthState(SIGNED_OUT, { type: "error", message: "nope" });
    expect(s.status).toBe("signed-out");
    expect(s.userId).toBeNull();
  });

  it("an error mid-sign-in does not leave the UI stuck on 'working'", () => {
    const working: AuthState = { ...SIGNED_OUT, status: "working" };
    expect(nextAuthState(working, { type: "error", message: "failed" }).status).toBe("signed-out");
  });

  it("losing the project configuration clears everything", () => {
    const s = nextAuthState(SIGNED_IN, { type: "no-cloud" });
    expect(s).toEqual({ status: "unconfigured", email: null, userId: null, error: null });
  });

  it("clears a stale error when a new attempt starts", () => {
    const errored: AuthState = { ...SIGNED_OUT, error: "old failure" };
    expect(nextAuthState(errored, { type: "working" }).error).toBeNull();
    expect(nextAuthState(errored, { type: "checking" }).error).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases, so a copy-pasted address still works", () => {
    expect(normalizeEmail("  Sam.Smith@Example.COM ")).toBe("sam.smith@example.com");
  });

  it("accepts the mailboxes people actually use, including Yahoo", () => {
    for (const e of ["a@b.co", "sam@yahoo.com", "s.k+tag@sub.example.org", "x_y-z@mail.example.io"]) {
      expect(normalizeEmail(e), e).not.toBeNull();
    }
  });

  it("rejects what would just bounce", () => {
    for (const e of ["", "sam", "sam@", "@example.com", "sam@example", "sam example@x.com", "a@b", "a@b.", "two@@example.com"]) {
      expect(normalizeEmail(e), e).toBeNull();
    }
  });

  it("rejects header-injection characters rather than passing them on", () => {
    for (const e of ["sam@example.com,evil@x.com", "sam@example.com;evil@x.com", "Sam <sam@example.com>", 'a"b@example.com']) {
      expect(normalizeEmail(e), e).toBeNull();
    }
  });

  it("rejects an address longer than the protocol allows", () => {
    expect(normalizeEmail(`${"a".repeat(250)}@example.com`)).toBeNull();
  });
});

describe("linkCooldownRemaining", () => {
  it("is zero before any link is sent", () => {
    expect(linkCooldownRemaining(null, 1_000_000)).toBe(0);
  });

  it("counts down from the cooldown and never goes negative", () => {
    const sent = 1_000_000;
    expect(linkCooldownRemaining(sent, sent)).toBe(LINK_COOLDOWN_SECONDS);
    expect(linkCooldownRemaining(sent, sent + 30_000)).toBe(LINK_COOLDOWN_SECONDS - 30);
    expect(linkCooldownRemaining(sent, sent + 120_000)).toBe(0);
  });
});
