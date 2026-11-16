# Domain structure spike: findings

Status: in progress. This is a spike log, not a plan of record. It records what
was done to prove out the agreed rules for `ghost/domains/`, what it cost, what
passed and failed, and where a rule did not survive contact with real code.

Throughout, **verified** means the command was run in this spike and the result
is quoted; **inferred** means it was read from source and not run.

## Step 1: baseline

Base commit: `3dca1a3` (main, "Started running "label added" automations").
Node v22.23.4, pnpm 12.16.1. Installed with
`corepack pnpm install --frozen-lockfile` (verified, exit 0).

| Check                                                                | Command                                                                                                | Result (verified)                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| recommendations, oembed and boot unit tests                          | `vitest run test/unit/server/services/recommendations test/unit/server/services/oembed test/unit/boot` | 25 files, 479 tests passed                                               |
| Full unit suite                                                      | `vitest run` in `ghost/`                                                                               | 806 files passed, 3 failed; 11569 tests passed, 34 failed (see below)    |
| Boundaries                                                           | `corepack pnpm lint:boundaries`                                                                        | passed: 5891 modules, 294 known violations, 189 deferred                 |
| Oxlint                                                               | `corepack pnpm lint:oxlint`                                                                            | passed                                                                   |
| Typecheck                                                            | `corepack pnpm nx run ghost:test:types`                                                                | passed. Plain `pnpm test:types` fails until workspace packages are built |
| DB-backed: recommendations (admin, content, members), oembed, emails | `vitest run -c vitest.config.db.ts <7 files>` against MySQL 8.4                                        | 7 files, 75 tests passed                                                 |
| Real boot from source (`node --conditions=source --import=tsx`)      | three warm boots against MySQL                                                                         | "Ghost booted in" 3.471s, 3.398s, 3.398s                                 |

The seven DB-backed files are
`test/e2e-api/{admin,content,members}/recommendations.test.js`,
`test/e2e-api/admin/oembed.test.js`,
`test/e2e-frontend/recommendations-well-known.test.js`,
`test/e2e-server/services/recommendation-emails.test.js` and
`test/e2e-server/well-known.test.ts`.

### Baseline failures that are not caused by the spike

The full unit suite fails 34 tests in 3 files on untouched main in this
container: `test/unit/server/lib/mailgun/mailgun-client.test.js` (31),
`test/unit/server/services/email-suppression-list/mailgun-email-suppression-list.test.ts`
(2) and `test/unit/server/lib/mail/ghost-mailer.test.js` (1). The errors show
the container's outbound proxy address prefixed to the Mailgun URL
(`ERR_INVALID_URL`, input `http://127.0.0.1:<port>https://api.mailgun.net/...`).
Clearing the proxy variables for the run did not change the result, so the
cause is only partly established: it is specific to this container, and its
exact mechanism was not verified. The bar for later steps is "the same 34 and
no others".

### Database

Docker Hub returned 429 and the ECR mirror's CDN is blocked by the container's
network policy. `mirror.gcr.io/library/mysql:8.4` pulled and runs. This is
MySQL 8.4 from a mirror, not the pinned `mysql:8.4.11` digest in
`compose.dev.yaml`.

### Facts checked against this main

Checked in the steps that touch them; see step 2.
