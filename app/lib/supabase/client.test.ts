/**
 * The promise that makes the two-mode design real: **an anonymous player
 * downloads none of the cloud code.**
 *
 * `@supabase/supabase-js` is reached through a dynamic import, so it is a separate
 * chunk. If someone ever converts that to a static import the app still works -
 * which is exactly why it needs a test: the regression is invisible, it just adds
 * ~30 KB to every first paint and runs auth code for people who never asked for an
 * account.
 *
 * The mock factory below records whether the module was ever evaluated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const loaded = { count: 0 };

vi.mock("@supabase/supabase-js", () => {
  loaded.count += 1;
  return {
    createClient: () => ({ auth: {}, from: () => ({}), rpc: async () => ({ error: null }) }),
  };
});

describe("the Supabase client, with no project configured", () => {
  beforeEach(() => {
    loaded.count = 0;
    vi.resetModules();
  });

  it("reports the app as unconfigured", async () => {
    const { isCloudConfigured } = await import("./client");
    expect(isCloudConfigured()).toBe(false);
  });

  it("returns no client, and never loads the library", async () => {
    const { getSupabase } = await import("./client");
    expect(await getSupabase()).toBeNull();
    expect(loaded.count, "supabase-js was imported for an anonymous player").toBe(0);
  });

  it("stays silent when asked repeatedly - the hot path must not retry an import", async () => {
    const { getSupabase } = await import("./client");
    await getSupabase();
    await getSupabase();
    await getSupabase();
    expect(loaded.count).toBe(0);
  });

  it("has no host to put in a Content-Security-Policy", async () => {
    const { cloudHost } = await import("./client");
    expect(cloudHost()).toBeNull();
  });
});
