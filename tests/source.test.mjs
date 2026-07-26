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

test("keeps the beginner path and technical proof surfaces together", async () => {
  const [page, engine] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("lib/proofpair-engine.mjs", root), "utf8"),
  ]);
  assert.match(page, /Review a sample case/);
  assert.match(page, /Start with the story—not the system/);
  assert.match(page, /Step 2 · Compare the evidence/);
  assert.match(page, /A recommendation you can inspect/);
  assert.match(page, /className="product-header"/);
  assert.match(page, /className="guided-shell"/);
  assert.doesNotMatch(page, /<aside className="sidebar"/);
  assert.match(page, /All disputes/);
  assert.match(page, /Why this decision\?/);
  assert.match(engine, /Role-swap symmetry/);
  assert.match(page, /Generate decision receipt/);
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
