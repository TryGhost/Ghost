# Contracts

A contract is a package that defines the shape of data crossing a boundary:
between Ghost Core and Admin, a public app, an installed app or an integration.
Both sides import the same definition, so they cannot disagree about it.

Ghost Core may import a contract anywhere, including inside a service, through
the package's public entry points. A contract therefore holds formats, types and
validation only: no application instances, configuration or I/O.

| Package                              | Defines                                                             |
| ------------------------------------ | ------------------------------------------------------------------- |
| [`app-contracts`](app-contracts)     | Manifests, identity and the bridge between Ghost and installed apps |
| [`metafield-types`](metafield-types) | Member custom field types and how a value of each is validated      |

Contracts follow the [internal package golden path](../packages/README.md), and
`pnpm lint:packages` checks them the same way. A published contract, such as
`@tryghost/metafield-types`, also needs a changeset when it changes.
