// @vitest-environment jsdom
/**
 * The account sheet, tested for the three things that would be quietly wrong.
 *
 * 1. **It must not appear at all when this deployment has no project.** A sign-in
 *    button that cannot work is worse than no sign-in button, and with no env vars
 *    that is every deployment - including a contributor's `npm run dev`.
 * 2. **It must not reveal who has an account here.** The reply to a link request
 *    is one sentence, whether the address is known or new. Copy that says "welcome
 *    back" would undo a property the backend deliberately has.
 * 3. **Its fields must be named, and it must pass axe**, like every other sheet -
 *    nine unnamed fields shipped once already (`lib/a11y.test.tsx`).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import type { AxeMatchers } from "vitest-axe/matchers";
import AccountPanel from "@/components/AccountPanel";

expect.extend(matchers);

// This project does not enable vitest globals, so Testing Library's automatic
// cleanup never registers: without this, a second render leaves the first in the
// document and every `screen` query finds two of everything.
afterEach(cleanup);

declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */
}

// No NEXT_PUBLIC_SUPABASE_* in the test environment, so this is the real
// unconfigured path - the one every fork and every contributor gets.
describe("AccountPanel with no project configured", () => {
  it("renders nothing when closed", () => {
    // jest-dom is not installed here, so assert the DOM directly.
    const { container } = render(<AccountPanel open={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("says the app is local-only, and offers no sign-in that cannot work", () => {
    render(<AccountPanel open onClose={() => {}} />);
    expect(screen.getByText(/no account service connected/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /continue with google/i })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("frames it as normal rather than as something missing", () => {
    render(<AccountPanel open onClose={() => {}} />);
    expect(screen.getByText(/nothing is missing/i)).toBeTruthy();
  });

  it("has no axe violations", async () => {
    const { container } = render(<AccountPanel open onClose={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * The signed-out and link-sent screens only exist when a project is configured, so
 * they are driven here by stubbing the auth module rather than the environment -
 * the component's contract is with `lib/auth`, not with `process.env`.
 */
describe("AccountPanel when a project is configured", () => {
  const withAuth = async (state: Record<string, unknown>) => {
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({
      useAuth: () => ({ status: "signed-out", email: null, userId: null, error: null, ...state }),
      signInWithGoogle: vi.fn(),
      sendMagicLink: vi.fn(),
      signOut: vi.fn(),
      deleteAccount: vi.fn(),
      linkCooldownRemaining: () => 0,
    }));
    const mod = await import("@/components/AccountPanel");
    return mod.default;
  };

  it("leads with what an account is for, and says playing without one still works", async () => {
    const Panel = await withAuth({ status: "signed-out" });
    render(<Panel open onClose={() => {}} />);
    expect(screen.getByText(/survive a cleared browser/i)).toBeTruthy();
    expect(screen.getByText(/keep playing with no account/i)).toBeTruthy();
  });

  it("names the email field and offers both ways in", async () => {
    const Panel = await withAuth({ status: "signed-out" });
    const { container } = render(<Panel open onClose={() => {}} />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy();
    const field = container.querySelector("input");
    expect(field?.getAttribute("id")).toBe("account-email");
    expect(container.querySelector('label[for="account-email"]')?.textContent).toMatch(/sign-in link/i);
    // A named field, and a name attribute so autofill stops guessing.
    expect(field?.getAttribute("name")).toBe("email");
  });

  it("does not say whether the address already had an account", async () => {
    const Panel = await withAuth({ status: "link-sent", email: "sam@example.com" });
    render(<Panel open onClose={() => {}} />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/check your inbox/i);
    expect(text).toMatch(/if .*sam@example\.com.* can receive mail/i);
    expect(text).not.toMatch(/welcome back|new account|account created|existing account/i);
  });

  it("makes deletion a typed confirmation, not a single tap", async () => {
    const Panel = await withAuth({ status: "signed-in", email: "sam@example.com", userId: "u1" });
    render(<Panel open onClose={() => {}} />);
    expect(screen.getByRole("button", { name: /delete my account/i })).toBeTruthy();
    // The destructive button itself is not on screen until the confirmation is.
    expect(screen.queryByRole("button", { name: /delete for ever/i })).toBeNull();
  });

  it("passes axe signed in, where the destructive path lives", async () => {
    const Panel = await withAuth({ status: "signed-in", email: "sam@example.com", userId: "u1" });
    const { container } = render(<Panel open onClose={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
