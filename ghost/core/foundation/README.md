# Foundation

Spike: see [the findings log](../../../docs/plans/domain-spike-findings.md).

The foundation is the stateful half of the framework: the running instances
that the [kernel](../kernel/README.md)'s stateless utilities are given. Config,
logging, the database, the event bus and the job runner belong here. Today they
still live where they always have (`shared/config`, `@tryghost/logging`,
`server/data/db`, `@tryghost/domain-events`, `server/services/jobs-service`), so
this folder holds only what the spike added:

- [`domains/manifest.ts`](domains/manifest.ts) finds the files in
  [`ghost/domains`](../../domains/README.md) once per process.
- [`domains/index.ts`](domains/index.ts) is the domain layer boot starts: the
  kernel's `createDomainLayer` given Ghost's event bus, logger and job runner.
