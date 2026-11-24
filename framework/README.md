# Framework code

Code here knows nothing about Ghost's product and would work unchanged for
another application. Code that is Ghost itself lives in [`ghost/`](../ghost).

| Folder     | Rule                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| `kernel/`  | Holds no state. Any file may import it, as `#kernel/…`                                 |
| `foundry/` | Builds what an application runs on. Only `ghost/bootstrap` imports it, as `#foundry/…` |

What each holds for the database:

| Import                          | What it is                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `#kernel/database`              | The `Database` type code is handed: `knex`, `dialect`, `server()`                |
| `#kernel/database/dialect`      | `dialectOf`, `isMySQL`, `isSQLite` for code handed a bare knex or transaction    |
| `#kernel/database/transaction`  | `ensureTransaction`, `transactionOf`                                             |
| `#kernel/database/after-commit` | `afterCommit`: run work once the transaction around it commits                   |
| `#kernel/database/columns`      | Column codecs that read MySQL and SQLite the same: dates, booleans, counts, JSON |
| `#foundry/database`             | `createDatabase` and `knexConfig`: build a handle from options. Bootstrap only.  |

Ghost tells the framework about itself in one place,
[`ghost/bootstrap`](../ghost/bootstrap/README.md).

The folder is `framework/`. The existing TryGhost/framework repository holds
libraries shared between TryGhost applications, such as `@tryghost/logging`;
its future, including its name, is a separate decision.

There are two kernels for now: `ghost/core/kernel` moves here in a follow-up.
