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
  assert.match(page, /Start guided review/);
  assert.match(page, /Step \{guideStep\} of 3/);
  assert.match(page, /All disputes/);
  assert.match(page, /Why this decision\?/);
  assert.match(engine, /Role-swap symmetry/);
  assert.match(page, /Generate decision receipt/);
});
