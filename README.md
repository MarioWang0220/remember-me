# remember-me

Project notes and requirements go in `notes/`.

## Quick Start

1. Add requirement docs to `notes/`
2. Push a branch / open PR to trigger CI checks
3. Use swarm-dev orchestration to scan and execute tasks

## CI Gate Policy

This template includes 4 CI jobs:

- `lint_typecheck`
- `unit_tests`
- `e2e_local`
- `playwright_preview`

### Phase 1 (default)

- Enforce: `lint_typecheck`, `unit_tests`
- `e2e_local` and `playwright_preview` stay visible but are not required

### Phase 2

- Enforce all 4 jobs
- Any failure blocks merge

Set phase variable:

```bash
gh variable set CI_TEST_PHASE --repo MarioWang0220/remember-me --body phase1
# later switch to phase2
gh variable set CI_TEST_PHASE --repo MarioWang0220/remember-me --body phase2
```

## Vercel Preview Test Secrets (Phase 2 Required)

Configure repository secrets:

```bash
gh secret set VERCEL_TOKEN --repo MarioWang0220/remember-me
gh secret set VERCEL_ORG_ID --repo MarioWang0220/remember-me
gh secret set VERCEL_PROJECT_ID --repo MarioWang0220/remember-me
```

If missing in Phase 2, preview job fails by design (fail-closed).

## Required package scripts

- `lint`
- `typecheck`
- `test:unit`
- `test:e2e`
- `test:playwright:preview`

## Branch Protection (manual)

- Phase 1 required checks:
  - `lint_typecheck`
  - `unit_tests`
- Phase 2 required checks:
  - `lint_typecheck`
  - `unit_tests`
  - `e2e_local`
  - `playwright_preview`

## Notes Format

Name your notes files like:

- `YYYY-MM-DD-feature-name.md`
- `YYYY-MM-DD-bug-description.md`
