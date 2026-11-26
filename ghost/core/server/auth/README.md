# Authentication subsystem

This directory keeps authentication and authorization middleware, staff sessions,
API-key and member-token authentication, staff permission checks, setup, password
reset and authentication reset together. It is an interim subsystem home while the longer-term ownership
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

The [previous inventory audit](https://github.com/TryGhost/Ghost/tree/1b10a390b8a23a60509e1a118da6186c3d584846/ghost/core/server/services/service-inventory.yaml#L847)
records the existing contracts, evidence and gaps. Its contract audit was checked
at `bf6a3ea2e32b7b551980c02c745e3c9b74e3ea0e`; its migration assessment was checked
at `f276513ba32b7114fd5cc4f7b02d3f82c0c31e3e`. Relocation does not refresh those audits.

Before changing initialization, settle the owners and readiness of the retained
session service, store, mailer, Express middleware and member JWT middleware.
Cover concurrent first use, construction failure and retry, captured configuration,
same-process restart, request persistence and resource cleanup. Setup and reset
orchestration also need ordering and transaction-failure coverage before their
behaviour changes. These are follow-up changes, separate from relocation.

## Permissions

[`permissions/`](permissions/) holds `canThis`, `parseContext` and the role
grants in `permissions-data.ts`. Grants are code, built into a frozen action map
at import; there is no boot initializer. Authentication loads the user's roles,
or an admin key's role, onto the principal, and `canThis` reads them from there
without reloading. A context naming a user or key must carry the principal for
it: `canThis` refuses one without it, so an in-process caller acting as a user
builds a principal, as setup does with its `setup` method.

[`policy/`](policy/) decides access from the principal. `capabilities` gives
the `object_type:action` keys its roles grant and the keys its token or app
scopes allow, and `authorize` checks one, then any row rule in
`policy/rules/`, throwing when it is refused. `canThis` refuses a key the
scopes lack, then passes the grant to the model `permissible` hooks as flags
until each hook becomes a row rule. An app refused for its scopes, by either,
is told which scope it lacked, as `403 APP_SCOPE_REQUIRED`; every other
refusal is the generic one. A principal of a kind the policy doesn't know is
granted nothing and its scopes allow nothing.

The [previous inventory audit](https://github.com/TryGhost/Ghost/tree/2700a443fe1ff989630efbdb5e8355f066959bbf/ghost/core/server/services/legacy-service-inventory.yaml#L5789)
records its contracts and open coverage gaps. Injecting models into
`canThis` still needs to keep `User.permissible`'s deferred
`require()` of this module, which avoids a model import cycle.
