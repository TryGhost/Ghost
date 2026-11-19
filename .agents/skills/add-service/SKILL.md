---
name: add-service
description: Create a new Ghost Core service with gx generate service, then finish what the generator leaves to the author - dependency wiring, boot initialization, tests and checks. Use when adding a new boot-owned capability under ghost/core/server/services. To adopt defineService in an existing service, use migrate-service instead.
---

# Add a service

The [services guide](../../../ghost/core/server/services/README.md) is the
authoring guide. This skill is the checklist that goes with it; follow the links
rather than copying a neighbouring service, which may still be legacy.

## 1. Check it is a service

Apply the guide's
[What belongs here](../../../ghost/core/server/services/README.md#what-belongs-here)
test first. A service root wires an instance that boot owns and callers share.
Name that instance, its callers and what must be ready before they use it. A
reusable constructor, an ordinary library or a helper used by one service is not
a service: put it where the guide says and stop here.

For an existing service, use [migrate-service](../migrate-service/SKILL.md).

Then read [creating a service](../../../ghost/core/server/services/README.md#creating-a-service),
[initialization](../../../ghost/core/server/services/README.md#initialization)
and the [kernel contract](../../../kernel/README.md#service-initialization).
[IndexNow](../../../ghost/core/server/services/indexnow-ping/index.ts) and its
[root test](../../../ghost/test/unit/server/services/indexnow-ping/index.test.ts)
are the worked example.

## 2. Generate the service

From the repository root:

```sh
pnpm gx generate service <name>
```

Use lowercase kebab-case beginning with a letter. Never write the root by hand.
The [generator](../../../tools/gx/README.md#service-generator) creates:

- `ghost/core/server/services/<name>/index.ts`, the `defineService` root
- `ghost/core/server/services/<name>/<name>-service.ts`, the implementation
- `ghost/test/unit/server/services/<name>/index.test.ts`, a starter root test

It registers nothing. A service that is not in the
[legacy service inventory](../../../ghost/core/server/services/README.md#standard-and-legacy-services)
is standard, so every service check applies from the first commit. Do not add
the service to the inventory's `services` list or to any lint configuration.

If the generator refuses a name because a path exists or the name is still
listed as legacy, read that code. Do not delete it to make generation succeed.

## 3. Implement and wire dependencies

Put behavior in the implementation and composition in the root's `create`
callback. The guide's
[dependency boundaries](../../../ghost/core/server/services/README.md#dependency-boundaries)
say what the root injects, what the implementation imports directly, and how to
handle live settings, deferred lookups and logging types. Apply them to every
implementation file, including nested helpers.

Delete the generated example comments once the real dependencies are wired.
Consumers read the instance through the root's `.service`. If a check rejects an
import, fix the wiring; do not widen the allowlist to make lint pass.

## 4. Add it to the services list

The generator leaves the
[services list](../../../ghost/bootstrap/services.ts) to you. Nothing is added
to `boot.js`.

- **Order.** The start sequence awaits `init()` on each entry, one after
  another. Place the entry after everything `create` reads and before anything
  that reads `.service` while it starts. Do not initialize on the first request.
- **Form.** One line, as the entries around it are:

  ```ts
  { name: 'delivery-receipts', load: () => require('../core/server/services/delivery-receipts').default },
  ```

  `pnpm lint:oxlint` and `gx services verify` find the root through that line.
  Lint fails until it is there.

- **Comments.** Replace the generated comment above `defineService` with what
  `create` needs ready. Where the order matters, say why beside the entry, as
  the existing comments there do.
- **Boot test.** `ghost/test/unit/boot/standard-services.test.ts` already
  checks that the start sequence waits for the root's `init()` and that its
  failure fails boot; do not write that test again. Where order matters, add
  the pair to the order table in `ghost/test/unit/bootstrap/steps.test.ts`.
- **Resources.** Finish startup work before returning the instance. Acquire
  listeners, timers and work to drain in `start` and release them in `stop`,
  following
  [starting and stopping](../../../ghost/core/server/services/README.md#starting-and-stopping).
  The framework calls `stop()` when Ghost stops; register nothing in boot.

## 5. Test and check

Extend the generated root test and add implementation tests for behavior,
dependency timing and readiness. If startup acquires resources, cover a failed
attempt followed by a successful retry. The
[testing guide](../../../docs/contributing/testing.md#run-focused-tests)
explains the focused commands.

A new service has no inventory entry. The one exception: if the root declares
`extras`, catalogue each one in the `followUps` section of
`ghost/core/server/services/legacy-service-inventory.yaml`, as the
[standard root contract](../../../ghost/core/server/services/README.md#standard-root-contract)
describes. The inventory test compares the names.

Run from the repository root:

```sh
pnpm nx run ghost:test:unit test/unit/server/services/<name>/index.test.ts
pnpm nx run ghost:test:unit test/unit/boot/ test/unit/bootstrap/
pnpm --filter ghost exec vitest run --config vitest.config.inventory.ts
pnpm lint:oxlint
pnpm lint:boundaries
pnpm check
```

`pnpm lint:oxlint` applies `ghost/service-root-shape` to the root and
`ghost/boot-awaits-service-init` to the services list.
`pnpm lint:boundaries` checks the implementation's imports. The inventory test
checks the directory has an `index.ts` root and that extras match the catalogue.

Commit with the repository commit skill, then run on the committed result:

```sh
pnpm gx services verify <name>
```

It needs a clean tree on a branch that contains the fetched `origin/main`. It
repeats the checks above, runs the full unit suite and confirms a boot test
fails when boot stops waiting for this root's `init()`. Run it again after
every rebase or fix.

Fix failures in the service rather than disabling a check. Report the commands
you ran and anything still failing.
