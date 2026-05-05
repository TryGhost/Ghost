# Lazy URL service benchmark plan

Tracking issue: [HKG-1772](https://linear.app/ghost/issue/HKG-1772/benchmark-lazy-url-resolution).

This file documents the methodology for evaluating the `lazyRouting` flag on
realistic data. Results live in the Linear project document, not in the repo.

## What we're measuring

| Metric | Tool | Notes |
| -- | -- | -- |
| Browse endpoint response time | `autocannon` | `/ghost/api/content/posts/?limit=15` |
| Single post read | `autocannon` | `/ghost/api/content/posts/slug/<known-slug>/` |
| Page render | `autocannon` | `/<slug>/` (frontend) |
| Sitemap generation | one-shot `curl --time` | `/sitemap.xml`, `/sitemap-posts.xml`, etc. |
| Memory (RSS, heap) | `process.memoryUsage()` sampled every 5s | logged during the autocannon run |
| Boot time | first `200` response after `pnpm start` | recorded by a wrapper script |

## Dataset

A clone of a large production Ghost(Pro) site (~250K posts). Two
`routes.yaml` configs are tested:

1. The default config (one unfiltered collection at `/`).
2. A non-trivial multi-collection config representative of the production
   site cohort identified in the
   [routes.yaml analysis](https://linear.app/ghost/document/ghostpro-routesyaml-analysis-de19baaf775e)
   (≥ 10 collections, mix of `tag:`, `primary_tag:`, `featured:`, and
   date-based permalinks).

## Procedure

For each `(routes.yaml, lazyRouting on/off)` combination:

1. Restart Ghost (`pnpm dev` or container restart). Record boot time.
2. Wait 30s for caches to settle.
3. Run `autocannon -d 60 -c <C>` with `<C>` ∈ {1, 50, 100} for each of the
   three latency targets above.
4. Capture median, p95, and p99 latency plus throughput.
5. Sample memory while step 3 is running.
6. Issue one cold-cache sitemap request per type (clear HTTP-level cache
   first), record total time.

Each combination runs three times; we report the median run.

## Acceptable thresholds (working hypothesis)

* Median page render latency increase ≤ 15% under c=100.
* p99 page render latency increase ≤ 30% under c=100.
* Per-instance RSS reduction ≥ 50% on the 250K-post dataset (the eager map
  is the main contributor; if the lazy mode does not free this we have a
  finding to act on).
* Sitemap generation ≤ 60s for the 250K-post dataset, served from HTTP cache
  thereafter.

If the lazy implementation misses any of these, the next step is Approach 2
from the design doc: layer per-resource memoization onto the lazy service.

## How to run locally

The flag is config-only:

```bash
echo '{"lazyRouting": true}' > ghost/core/config.local.json
pnpm dev
```

`pnpm dev` resolves config from the workspace root; flip the value to switch
modes between runs.
