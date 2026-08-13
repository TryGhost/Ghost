# Ghost Core End-to-End Tests

Ghost Core's end-to-end framework provides one place to access request agents,
fixtures, mocks, and snapshot matchers. Tests use it by requiring
`test/utils/e2e-framework.js`.

```js
const {agentProvider, fixtureManager, mockManager, matchers} =
    require('../utils/e2e-framework');

const agent = await agentProvider.getAdminAPIAgent();
await fixtureManager.init('members');
await agent.loginAsOwner();
```

## Request agents

The framework provides agents for the Admin, Content, and Members APIs. Agents
boot Ghost with suitable defaults, reset the database, configure the API base
path, and provide authentication helpers.

Requests use async/await. Assert the response status, body, and relevant headers.
Use the snapshot matchers for generated IDs, dates, ETags, and locations, and
add focused assertions for important behavior such as ordering and side effects.

## Fixtures

Use `fixtureManager.init()` to insert fixture tasks in a known state. Basic
fixtures such as roles, permissions, and the owner are already available.
Named tasks add the data required by a test; for example, `users` creates a
staff user for each role and `users:inactive` adds an inactive user.

Older tests may use `localUtils.doAuth()` or `testUtils.setup()`, but new
end-to-end tests should use the fixture manager and request agents.

## Mocks

`mockManager` handles external effects. Use `mockManager.mockMail()` to inspect
outgoing email and match HTML, plain text, and metadata snapshots. Restore mocks
after each test.

The webhook mock receiver follows the same pattern for outgoing webhooks.

## Test style

- Keep tests fast and make only the requests needed for the behavior.
- Use `expectEmptyBody` for responses such as `204`.
- Test side effects as well as the response.
- Give tests names that remain clear in snapshot files.
- Do not use the old test utilities in new tests.
