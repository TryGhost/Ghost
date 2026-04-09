# Mirror Playwright to GHCR via Reusable Action, Gated from Setup

## Summary
Mirror the pinned Playwright image from MCR into GHCR using a reusable composite action, but avoid adding a new job to the E2E critical path. The existing `job_setup` will cheaply determine whether the pinned Playwright version changed relative to the base commit and whether the required GHCR tag already exists. Only when the version changed or the tag is missing will setup perform the mirror. E2E will always pull an exact versioned GHCR tag, with no `latest` tag involved. If a fork PR changes the Playwright version and setup cannot publish the new GHCR tag, CI will fail fast rather than fall back to MCR.

## Implementation Changes
- Add a reusable composite action at `.github/actions/mirror-container-image`.
  - Inputs:
    - `source-image`: fully qualified upstream image reference
    - `target-image`: fully qualified GHCR image reference
  - Behavior:
    - `docker pull` source
    - `docker tag` source to target
    - `docker push` target
  - Keep it minimal and exact-tag only; do not support or publish `latest`.
  - Assume GHCR login is handled by the caller.

- Add a dedicated proactive workflow at `.github/workflows/publish-playwright-image.yml`.
  - Triggers:
    - `workflow_dispatch`
    - `push` to `main` when `e2e/package.json` changes
  - Permissions:
    - `contents: read`
    - `packages: write`
  - Steps:
    - checkout
    - read `@playwright/test` from `e2e/package.json`
    - derive:
      - source: `mcr.microsoft.com/playwright:v${VERSION}-noble`
      - target: `ghcr.io/tryghost/playwright:v${VERSION}-noble`
    - log in to GHCR
    - call the reusable mirror action
  - Purpose:
    - keep GHCR warm on `main`
    - provide a manual repair path
  - No `latest` tag will be published.

- Extend `job_setup` in `.github/workflows/ci.yml` so it becomes the gatekeeper for Playwright mirroring.
  - Add outputs from setup:
    - `playwright_version`
    - `playwright_image`
    - `playwright_version_changed`
    - `playwright_image_exists`
    - `playwright_mirror_attempted`
  - Add a step that reads the current pinned Playwright version from `e2e/package.json`.
  - Add a step that reads the base commit's Playwright version from `e2e/package.json` using the already-computed `BASE_COMMIT`.
    - For PRs, compare against the PR base SHA.
    - For pushes, compare against the computed push base commit.
  - Compute `playwright_version_changed=true|false`.
  - Add a cheap GHCR existence check for `ghcr.io/tryghost/playwright:v${VERSION}-noble`.
    - This should happen in setup so downstream jobs do not need their own verification work.
  - If the image already exists:
    - emit `playwright_image=ghcr.io/tryghost/playwright:v${VERSION}-noble`
    - do nothing else
  - If the image is missing and the version did not change:
    - still attempt to mirror it in setup, because missing-tag drift should self-heal
  - If the image is missing and setup is allowed to publish:
    - log in to GHCR
    - call the reusable mirror action
    - emit `playwright_image=ghcr.io/tryghost/playwright:v${VERSION}-noble`
  - If the image is missing and setup cannot publish:
    - fail setup immediately
    - this is the expected behavior for fork PRs that bump Playwright without an existing mirrored image

- Update Playwright image resolution in `e2e/scripts/load-playwright-container-env.sh`.
  - Keep `e2e/package.json` as the single version source of truth.
  - Default `PLAYWRIGHT_IMAGE` to `ghcr.io/tryghost/playwright:v${PLAYWRIGHT_VERSION}-noble`.
  - Preserve explicit `PLAYWRIGHT_IMAGE` override behavior for manual/local debugging.
  - Do not add any fallback-to-MCR logic in the script.

- Update E2E shard jobs to consume setup's resolved image without adding a new dependency edge.
  - Pass `PLAYWRIGHT_IMAGE=${{ needs.job_setup.outputs.playwright_image }}` into the E2E job environment.
  - Keep `job_e2e_tests` depending only on the existing jobs; no extra mirror job is introduced.
  - Keep the existing parallel pre-pull in `prepare-ci-e2e-build-mode.sh`; it will now use the exact GHCR image selected by setup.

- Extend GHCR cleanup for the new Playwright package in `.github/workflows/cleanup-ghcr.yml`.
  - Add `playwright` to the package matrix.
  - Use package-specific retention logic for `playwright`:
    - keep the newest `MIN_KEEP` versions
    - keep versions newer than the retention cutoff
    - delete older Playwright versions beyond that
  - Do not apply the existing "keep semver tags forever" rule to `playwright`.
  - Leave current cleanup behavior unchanged for `ghost`, `ghost-core`, and `ghost-development`.

## Public Interfaces / Behavior Changes
- New reusable composite action:
  - `.github/actions/mirror-container-image`
- New GHCR package:
  - `ghcr.io/tryghost/playwright`
- Published tag format:
  - `ghcr.io/tryghost/playwright:v<playwright-version>-noble`
- New CI behavior:
  - `job_setup` verifies or creates the exact mirrored Playwright tag before downstream jobs run
  - E2E always uses the exact versioned GHCR tag chosen by setup
  - no `latest` tag is used or published
- Failure behavior:
  - if the required GHCR Playwright tag is missing and setup cannot publish it, setup fails fast

## Test Plan
- Reusable action:
  - validate it mirrors an arbitrary exact-tag image from source to GHCR with no `latest` handling
  - confirm it is usable from both the proactive workflow and setup job

- Proactive publish workflow:
  - manually trigger `publish-playwright-image.yml`
  - confirm it reads the pinned version from `e2e/package.json`
  - confirm `ghcr.io/tryghost/playwright:v<version>-noble` is published successfully

- Setup gating:
  - test a normal CI run where the GHCR tag already exists and confirm setup only performs the cheap version/existence checks
  - test a simulated version bump where the GHCR tag does not exist and confirm setup mirrors it successfully
  - test a simulated missing-tag case without a version bump and confirm setup self-heals by re-mirroring it

- E2E integration:
  - confirm E2E shards receive `PLAYWRIGHT_IMAGE` from setup outputs
  - confirm the pre-pull path uses the GHCR tag and does not reference MCR during the E2E run

- Failure path:
  - simulate a fork/untrusted context with a missing required GHCR tag
  - confirm setup fails immediately rather than falling back to MCR
  - confirm the failure message clearly indicates that the mirrored Playwright tag must be published first

- Cleanup:
  - run `cleanup-ghcr.yml` in dry-run mode with `playwright` included
  - confirm old Playwright versions are eligible for deletion based on age and minimum-keep rules
  - confirm existing Ghost package retention behavior is unchanged

## Assumptions
- `@playwright/test` remains pinned to an exact version in `e2e/package.json`.
- The mirrored Playwright image is an unchanged upstream mirror from MCR.
- Setup is allowed to perform the mirror only in trusted contexts where GHCR package write access is available.
- Exact versioned tags are the only supported contract; no moving aliases such as `latest` are needed.
- Failing fast for fork PRs that introduce a new, unpublished Playwright version is acceptable.
