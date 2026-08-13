# Load Testing and Benchmarking

Performance testing is important for high-volume or intensive workflows. Two
tools commonly used with Ghost are `loadtest` for a simple endpoint and
`artillery` for multi-step or variable traffic.

## loadtest

Install `loadtest` globally, then specify the total requests and concurrency:

```bash
npm install -g loadtest
loadtest -n 500 -c 5 http://localhost:2368/
```

It can also run at a fixed request rate for a duration:

```bash
loadtest -t 30 --rps 50 http://localhost:2368/
```

## Artillery

Install Artillery globally:

```bash
npm install -g artillery@latest
```

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
artillery run load-test.yml
```

## Getting useful results

Request pooling, keep-alive, timeouts, concurrency, cookies, and headers can all
change the result. Match them to the behavior being investigated. Ghost caches
public content, so decide whether the test is intended to measure cached or
uncached requests.

Local testing starts at [http://localhost:2368](http://localhost:2368). Local
hardware and production hosting differ, but local results can still show whether
a change improves or degrades a focused workflow.
