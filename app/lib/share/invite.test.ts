// @vitest-environment jsdom
/**
 * Writer invites, on the client side.
 *
 * The interesting cases are the words, not the wiring: an invite must be
 * distinguishable from a view link for the person sending it, every refusal must be one
 * message (because the database deliberately does not say which of unknown / expired /
 * revoked / wrong-kind applies), and a helper must be named on screen without leaking an
 * email when a display name exists.
 */
import { describe, it, expect } from "vitest";
import { inviteUrlFor, memberLabel, acceptInvite, type MemberRow } from "./invite";
import { tokenFromHash } from "./eventShare";

const row = (over: Partial<MemberRow>): MemberRow => ({
  user_id: "u1", display_name: null, email: null, role: "writer",
  created_at: "2026-09-20T10:00:00Z", ...over,
});

describe("the invite URL", () => {
  it("goes to /join, not /shared - a helper is not a spectator", () => {
    const url = inviteUrlFor("A".repeat(43), "https://example.test");
    expect(url.startsWith("https://example.test/join#t=")).toBe(true);
  });

  it("keeps the token in the fragment, so an OAuth redirect cannot strip it", () => {
    const token = "B".repeat(43);
    const url = inviteUrlFor(token, "https://example.test");
    expect(url.split("#")[0]).not.toContain(token);
    expect(tokenFromHash(new URL(url).hash)).toBe(token);
  });
});

describe("memberLabel", () => {
  it("prefers a display name, so an email is not shown unnecessarily", () => {
    expect(memberLabel(row({ display_name: "Priya", email: "priya@example.test" }))).toBe("Priya");
  });

  it("falls back to the email, which is all the owner may have", () => {
    expect(memberLabel(row({ email: "sam@example.test" }))).toBe("sam@example.test");
  });

  it("never renders an empty row", () => {
    expect(memberLabel(row({ display_name: "   ", email: "  " }))).toBe("A helper");
    expect(memberLabel(row({}))).toBe("A helper");
  });
});

describe("acceptInvite", () => {
  it("will not try without a token", async () => {
    expect(await acceptInvite(null, true)).toEqual({ ok: false, reason: "no-token" });
  });

  it("says sign in first, rather than failing against the database", async () => {
    expect(await acceptInvite("A".repeat(43), false)).toEqual({ ok: false, reason: "signed-out" });
  });

  it("reports an unconfigured deployment instead of a dead invite", async () => {
    // No NEXT_PUBLIC_SUPABASE_* in the test environment: this is the fork/dev case, and
    // telling a helper their invite is broken would send them back to the organiser for
    // nothing.
    expect(await acceptInvite("A".repeat(43), true)).toEqual({ ok: false, reason: "unconfigured" });
  });
});
