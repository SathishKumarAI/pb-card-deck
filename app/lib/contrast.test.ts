import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * The colour audit, as a test. `scripts/contrast-audit.mjs` reads globals.css
 * and exits non-zero if any text/surface pair falls under its WCAG threshold,
 * so a palette edit that breaks contrast fails here rather than in someone's
 * sunlight.
 */
describe("colour contrast", () => {
  it("every text and surface pair meets its WCAG threshold, in both themes", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    let output = "";
    let failed = false;
    try {
      output = execFileSync("node", [join(root, "scripts", "contrast-audit.mjs")], {
        cwd: root,
        encoding: "utf8",
      });
    } catch (err) {
      failed = true;
      output = String((err as { stdout?: string }).stdout ?? err);
    }
    // Show the table when it breaks, so the failure names the pair.
    expect(failed ? output : "", output).toBe("");
    expect(output).toContain("All pairs meet their threshold.");
  });
});
