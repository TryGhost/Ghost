# Ghost Core End-to-End Tests

Ghost Core's server end-to-end framework provides one place to access request
agents, fixtures, mocks, and snapshot matchers. These are Vitest suites which
exercise Ghost directly; they are separate from the Playwright browser suite in
the repository's `e2e/` directory.

```js
const {agentProvider, fixtureManager, mockManager, matchers} =
    require('../utils/e2e-framework');

let agent;

beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('members');
    await agent.loginAsOwner();
});
```

## Request agents

The framework provides agents for the Admin, Content, and Members APIs. Agents
boot Ghost with suitable defaults, reset the database, configure the API base
path, and provide authentication helpers.

Requests use async/await. Assert the response status, body, and relevant headers.
Use the snapshot matchers for generated IDs, dates, ETags, and locations, and
add focused assertions for important behavior such as ordering and side effects.

## Fixtures

Use `fixtureManager.init()` to insert fixture tasks in a known state. The
framework includes the owner fixture by default. Named tasks add the data
required by a test; for example, `users` creates staff users for each role and
`user:inactive` adds an inactive user.

Older tests may use `localUtils.doAuth()` or `testUtils.setup()`, but new
end-to-end tests should use the fixture manager and request agents.

## Mocks

`mockManager` handles external effects. Use `mockManager.mockMail()` to inspect
outgoing email and match HTML, plain text, and metadata snapshots. Restore mocks
after each test.

The webhook mock receiver follows the same pattern for outgoing webhooks.

Real network access is disabled when the framework boots. Use a focused mock or
an existing `mockManager` helper for external services.

## Snapshots

Request agents provide `matchBodySnapshot()` and `matchHeaderSnapshot()`. Use
the most specific matcher available for values that change between runs, such
as object IDs, UUIDs, dates, ETags, and resource locations.

To update a snapshot for one test, run:

```bash
SNAPSHOT_UPDATE=1 pnpm test:single test/e2e-api/path/to/test.test.js
```

Review every changed `.snap` file before committing it. A generated snapshot is
not proof that the response is correct.

## Test style

- Keep tests fast and make only the requests needed for the behavior.
- Use `expectEmptyBody` for responses such as `204`.
- Test side effects as well as the response.
- Give tests names that remain clear in snapshot files.
- Do not use the old test utilities in new tests.

## Running the tests

From `ghost/core`:

```bash
pnpm test:e2e
pnpm test:single test/e2e-api/path/to/test.test.js
```

The main groups are `test/e2e-api/`, `test/e2e-frontend/`,
`test/e2e-webhooks/`, and `test/e2e-server/`. Isolated tests use an
`.isolated.test.js` or `.isolated.test.ts` suffix inside `test/e2e-server/`.
Start from a nearby test in the same group because boot options, agent choice,
and cleanup requirements vary by boundary.
