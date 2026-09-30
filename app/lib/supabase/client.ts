/**
 * The Supabase client, created at most once, and only if this deployment has
 * been given a project.
 *
 * This file owns WHETHER there is a cloud at all and how the client is
 * configured. It owns no table, no query and no auth flow.
 *
 * Two properties matter more than anything else here:
 *
 * 1. **Unconfigured is a supported state.** With no env vars, `getSupabase()`
 *    returns null and the app is the local-first one. A fork with no Supabase
 *    project works, and so does `npm run dev` for a contributor.
 * 2. **An anonymous player downloads none of this.** `@supabase/supabase-js` is
 *    reached through a dynamic `import()`, so it is a separate chunk that is
 *    fetched the first time someone opens the account sheet - never during a
 *    game. `lib/supabase/client.test.ts` fails if that stops being true.
 *
 * The key in the browser is the PUBLISHABLE key (`sb_publishable_…`), which
 * carries no privileges of its own - row-level security decides everything. The
 * legacy `anon` key is the same role under an older name and is accepted for
 * now; Supabase is retiring it by the end of 2026. A secret key must never
 * appear in a `NEXT_PUBLIC_*` variable: that prefix means "shipped to every
 * visitor".
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Has this deployment been given a Supabase project? Cheap, synchronous, safe to call during render. */
export function isCloudConfigured(): boolean {
  return Boolean(url && key);
}

/** The project host, for the CSP and for error messages. Null when unconfigured. */
export function cloudHost(): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

let client: SupabaseClient | null = null;
let pending: Promise<SupabaseClient | null> | null = null;

/**
 * The client, or null when this deployment has no project. Awaiting it is what
 * loads the library, so nothing calls this on a hot path.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isCloudConfigured()) return null;
  if (client) return client;
  if (!pending) {
    pending = import("@supabase/supabase-js")
      .then(({ createClient }) => {
        client = createClient(url as string, key as string, {
          auth: {
            // Explicit, though it is the browser default: PKCE is what stops an
            // intercepted authorization code from being redeemable.
            flowType: "pkce",
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
          global: { headers: { "x-client-info": "pb-card-deck" } },
        });
        return client;
      })
      .catch((err) => {
        // A failed chunk load must not take the app down: the player is still
        // playing, locally, which is the whole point of the architecture.
        pending = null;
        console.warn("[pb] Supabase client unavailable:", err);
        return null;
      });
  }
  return pending;
}

/** Test seam: forget the singleton so a test can assert the import behaviour twice. */
export function resetSupabaseForTests() {
  client = null;
  pending = null;
}
