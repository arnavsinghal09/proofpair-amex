import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("uses the standard Next.js runtime with no prior-hosting markers", async () => {
  const [packageJson, page, layout] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);

  assert.match(packageJson, /"dev": "next dev"/);
  assert.match(packageJson, /"build": "next build --webpack"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|cloudflare/i);
  assert.doesNotMatch(`${page}\n${layout}`, /chatgpt|codex-preview|signin-with-chatgpt/i);
});

test("ships the complete analyst operating system with readable typography", async () => {
  const [page, styles, engine] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("lib/proofpair-engine.mjs", root), "utf8"),
  ]);
  assert.match(page, /Resolution command center/);
  assert.match(page, /Dispute queue/);
  assert.match(page, /Case overview/);
  assert.match(page, /Evidence room/);
  assert.match(page, /Decision studio/);
  assert.match(page, /Communications/);
  assert.match(page, /Audit trail/);
  assert.match(page, /Portfolio intelligence/);
  assert.match(page, /Governance & controls/);
  assert.match(page, /What happened/);
  assert.match(page, /Party positions/);
  assert.match(page, /GOVERNED RECOMMENDATION/);
  assert.match(page, /POLICY TRACE/);
  assert.match(page, /BEHAVIORAL ASSURANCE/);
  assert.match(engine, /Role-swap symmetry/);
  assert.match(page, /Review decision receipt/);
  assert.match(styles, /--amex-blue:\s*#016fd0/);
  assert.match(styles, /--amex-midnight:\s*#002663/);
  assert.match(styles, /--abbey:\s*#4d4f53/);
  assert.match(styles, /--serif:/);
  assert.match(styles, /\.product-shell:has\(\.modal-backdrop\)/);
  assert.doesNotMatch(styles, /border-radius:\s*(?:[3-9]|[1-9][0-9]+)px/);
  assert.doesNotMatch(page, /Switch persona|Viewing as|90-second|home-hero|guided-shell|chatgpt/i);
  assert.doesNotMatch(styles, /font-size:\s*(?:[7-9]|10|11)px/);
});

test("keeps every primary analyst workflow operational instead of decorative", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);

  assert.match(page, /NotificationCenter/);
  assert.match(page, /patchCases/);
  assert.match(page, /column-manager/);
  assert.match(page, /bulk-action-panel/);
  assert.match(page, /narrative-editor/);
  assert.match(page, /assignment-editor/);
  assert.match(page, /Evidence inspector/);
  assert.match(page, /Mark as reviewed/);
  assert.match(page, /queueMessage/);
  assert.match(page, /Policy change log/);
  assert.match(page, /downloadFile/);
  assert.match(page, /window\.print/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(styles, /\.side-panel-backdrop/);
  assert.match(styles, /\.communication-filters/);
  assert.match(styles, /button:disabled/);
});

test("pins a reproducible GitHub and Vercel release contract", async () => {
  const [packageJson, lockfile, workflow, vercel, nodeVersion] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("package-lock.json", root), "utf8"),
    readFile(new URL(".github/workflows/ci.yml", root), "utf8"),
    readFile(new URL("vercel.json", root), "utf8"),
    readFile(new URL(".nvmrc", root), "utf8"),
  ]);

  assert.match(packageJson, /"node": "22\.x"/);
  assert.match(packageJson, /"preflight": "npm ci && npm run ci"/);
  assert.match(lockfile, /"lockfileVersion": 3/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run ci/);
  assert.match(vercel, /"installCommand": "npm ci"/);
  assert.match(vercel, /"buildCommand": "npm run build"/);
  assert.equal(nodeVersion.trim(), "22");
});
