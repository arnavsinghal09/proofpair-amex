# Deployment playbook

This project uses GitHub as the source of truth and Vercel as the production host.

## One-time setup

1. Import the GitHub repository into Vercel.
2. Keep the framework preset set to **Next.js**.
3. Keep the production branch set to `main`.
4. Enable automatic deployments from Git.
5. In GitHub branch protection, require the **Lint, test, and production build** check before merging to `main`.
6. In Vercel deployment protection, require Git checks to pass before production promotion when the account plan supports it.

No environment variables are required for this prototype.

## Release gate

Before pushing:

```bash
npm run preflight
```

The command performs a clean lockfile install, linting, deterministic tests, source-integrity checks, TypeScript validation, and a production build.

After pushing:

1. Confirm GitHub Actions reports a green **CI** workflow for the release commit.
2. Confirm Vercel built the same commit SHA.
3. Open the production URL in a signed-out browser.
4. Complete the guided three-step review.
5. Check desktop and narrow mobile widths.
6. Confirm the browser console has no errors.
7. Verify the decision receipt and fairness checks.

## Why deployment is reproducible

- `.nvmrc` and `package.json` pin Node.js to major version 22.
- `package-lock.json` pins the complete dependency graph.
- CI and Vercel both install with `npm ci`.
- CI and Vercel both run the repository’s production build command.
- No hosting-specific SDK, secret, database, or environment variable is required.

## Recovery

If Vercel fails:

1. Match the failing Vercel commit SHA to GitHub.
2. Reproduce with `npm run preflight`.
3. Fix the source or lockfile; do not override a failed build.
4. Push a new commit and let GitHub/Vercel rebuild it.
5. Never promote a deployment whose commit does not have a green CI run.

If repository authentication expires:

```bash
gh auth login -h github.com
gh auth setup-git
gh auth status
```

Do not store GitHub or Vercel tokens in the repository.
