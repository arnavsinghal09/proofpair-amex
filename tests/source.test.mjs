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

test("keeps the analyst workflow focused, readable, and progressively disclosed", async () => {
  const [page, styles, engine] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("lib/proofpair-engine.mjs", root), "utf8"),
  ]);
  assert.match(page, /Cases needing a decision/);
  assert.match(page, /What happened/);
  assert.match(page, /Evidence from both parties/);
  assert.match(page, /Recommended next step/);
  assert.match(page, /Decision rules/);
  assert.match(page, /How ProofPair stays accountable/);
  assert.match(engine, /Role-swap symmetry/);
  assert.match(page, /Review decision receipt/);
  assert.match(page, /data-label="Merchant \/ member"/);
  assert.match(styles, /\.queue-head \{ display: none; \}/);
  assert.match(styles, /\.app-shell:has\(\.modal-backdrop\)/);
  assert.doesNotMatch(page, /Switch persona|Viewing as|90-second|home-hero|guided-shell/);
  assert.doesNotMatch(styles, /font-size:\s*(?:[7-9]|10|11)px/);
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
