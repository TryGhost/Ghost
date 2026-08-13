# Load Testing and Benchmarking

Performance testing is important for high-volume or intensive workflows. Two
tools commonly used with Ghost are `loadtest` for a simple endpoint and
`artillery` for multi-step or variable traffic.

## loadtest

Run `loadtest` with pnpm and specify the total requests and concurrency:

```bash
pnpm dlx loadtest -n 500 -c 5 http://localhost:2368/
```

It can also run at a fixed request rate for a duration:

```bash
pnpm dlx loadtest -t 30 --rps 50 http://localhost:2368/
```

## Artillery

Artillery uses a YAML test definition and supports phased rates, several
requests in one flow, and processor functions for variable input:

```yaml
config:
  target: "http://localhost:2368"
  phases:
    - duration: 15
      arrivalRate: 50

scenarios:
  - name: "Home page"
    flow:
      - get:
          url: "/"
```

Run it with:

```bash
pnpm dlx artillery run load-test.yml
```

## Getting useful results

Request pooling, keep-alive, timeouts, concurrency, cookies, and headers can all
change the result. Match them to the behavior being investigated. Ghost caches
public content, so decide whether the test is intended to measure cached or
uncached requests.

Local testing starts at [http://localhost:2368](http://localhost:2368). Local
hardware and production hosting differ, but local results can still show whether
a change improves or degrades a focused workflow.

Only send load to a system you own or have explicit permission to test. The
public repository does not document production or hosted-service load-testing
procedures.

See the [`loadtest` README](https://github.com/alexfernandez/loadtest) and
[Artillery documentation](https://www.artillery.io/docs/get-started/core-concepts)
for the current command and scenario options.
