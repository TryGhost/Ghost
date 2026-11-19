# Automations

Automations run a sequence of actions for a member in response to events such as signup or a paid subscription change. Each automation has trigger rules and a single ordered path of `wait` and `send_email` actions. Automations can be active, inactive, or archived.

A run records one member's progress. Its steps refer to action revisions, so recorded history survives later edits to the automation.

## How execution works

The member code notifies the automations API of an event. Matching automations enroll the member, store runs and their first steps, and request a poll after the transaction commits.

Ghost's boot process starts `AutomationsService`. It responds to poll requests and keeps processing scheduled with an in-memory timer and external scheduler callbacks. The poller runs inside the Ghost process, not as a separate worker process.

The poller claims ready steps, checks current member eligibility, and executes the actions. It records outcomes through the API and requests another poll when needed. Disabled automations and ineligible members stop progressing, but disabling does not cancel freshly claimed steps, which may still execute. Older welcome-email runs still have a separate poller.

## Responsibilities

- **API:** [Application operations](automations-api.ts), used by Admin endpoints, member code, analytics, and the poller. Owns enrollment, editing, tracking, and atomic step transitions.
- **Service:** [Process-lifetime coordination](service.ts), including event subscriptions, timers, and scheduler callbacks.
- **Poller:** [Step execution](poll.ts), including eligibility checks, email sending, retries, and deciding when to poll again.
- **Repository:** Database reads, locks, and mutations behind an explicit data-access interface.

The API and repository are being refactored. The [`-2` API](automations-api-2.ts), [repository contract](automations-repository-2.ts), and [Knex implementation](database-automations-repository-2.ts) define the target pattern; the older files still contain operations awaiting migration.

## Statistics and history

Tinybird supplies performance statistics and run browsing. Core supplies current member details and recorded run history from its database. Deleted members do not erase recorded runs, and historical recipient details are not substituted for current member data.

Performance statistics require Tinybird configuration. When statistics are unavailable, the automation list can still load without them. See the [Tinybird storage notes](../../data/tinybird/README.md#automation-statistics) for the analytics data model.

## Working on automations

[AGENTS.md](AGENTS.md) contains implementation boundaries, migration guidance, and behavior-preservation rules. Follow the repository's [testing guide](../../../../../docs/contributing/testing.md) for commands and setup; the [Admin API tests](../../../../test/e2e-api/admin/automations.test.ts) cover automation reads and edits.
