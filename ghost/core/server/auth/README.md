# Authentication subsystem

This directory keeps authentication and authorization middleware, staff sessions,
API-key and member-token authentication, setup, password reset and authentication
reset together. It is an interim subsystem home while the longer-term ownership
of identity policy, HTTP middleware and session resources is settled.

Moving the subsystem out of `services/` does not change its runtime contract.
The root keeps its lazy CommonJS getters. Loading `session/` still constructs
the session service, store, mailer and request middleware; Express session and
member JWT middleware still initialize on first use. SSO middleware still
borrows the shared adapter. There is no new boot initializer or shutdown hook.

See the [authentication guide](../../../../docs/codebase/authentication.md) for
request flows and the [unit tests](../../../test/unit/server/auth/) for the
subsystem's existing tests. Booted API tests remain under `test/e2e-api/`.

## Lifecycle follow-up

The [previous inventory audit](https://github.com/TryGhost/Ghost/blob/1b10a390b8a23a60509e1a118da6186c3d584846/ghost/core/server/services/service-inventory.yaml#L847)
records the existing contracts, evidence and gaps. Its contract audit was checked
at `bf6a3ea2e32b7b551980c02c745e3c9b74e3ea0e`; its migration assessment was checked
at `f276513ba32b7114fd5cc4f7b02d3f82c0c31e3e`. Relocation does not refresh those audits.

Before changing initialization, settle the owners and readiness of the retained
session service, store, mailer, Express middleware and member JWT middleware.
Cover concurrent first use, construction failure and retry, captured configuration,
same-process restart, request persistence and resource cleanup. Setup and reset
orchestration also need ordering and transaction-failure coverage before their
behaviour changes. These are follow-up changes, separate from relocation.
