# Shared

Ghost-specific code that several domains use and that no one domain owns. Host
limits are the example: posts, members, staff and themes all check them.

Code belongs here only when all three are true:

- it knows Ghost's product, so it is not [framework code](../../framework/README.md)
- more than one domain uses it
- no single domain is the better owner

A shared module is handed what it needs. It imports the kernel's types, and it
never imports the logger, config or the database: whoever calls it passes in
the foundation that [`ghost/bootstrap`](../bootstrap/README.md) assembled.
[`limits/index.ts`](limits/index.ts) shows the shape.
