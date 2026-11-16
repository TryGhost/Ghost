# Release a field type

How to release a field type that was built behind its Labs flag: switch it on for Ghost(Pro)
sites, then remove the flag, which releases it everywhere. Why it goes in this order is
explained in
[Why a new field type starts behind a flag](../explanation/why-a-new-field-type-starts-behind-a-flag.md).

1. **Settle the type.** Once publishers can create fields of it, what it is composed of can't
   change, so make any last change to its structure or storage now, and merge it.
2. **Wait for the type's code to reach every site.** Admin on Ghost(Pro) goes live as each
   commit is merged, and Ghost(Pro) servers roll out on weekdays. Wait until every Ghost(Pro)
   server runs a release with the type's code.
3. **Switch the flag on for Ghost(Pro).** Set it in the remote flags manifest, as `true`, or as
   `{ "value": true, "percent": 10 }` to start with a share of sites. Admin and Ghost read the
   same flag, so both offer the type from then on. How flag values are resolved is in
   [Feature flags](../../../../docs/practices/feature-flags.md).
4. **Remove the flag.** Once the manifest has the flag at a plain `true` and Ghost(Pro) servers
   have picked it up, remove the type's
   entry from `FIELD_TYPE_FLAGS`, which releases it, remove the flag from `PRIVATE_FEATURES` in
   Ghost's [`labs.js`](../../../../ghost/core/shared/labs.js), and remove its toggle from
   Admin's
   [`private-features.tsx`](../../../../apps/admin/src/settings/advanced/labs/private-features.tsx).
   Self-hosted sites get the type in the
   next public release, with Admin and Ghost together. Don't do this while the manifest still
   holds the flag at a percentage: each Ghost(Pro) server offers the type to every site once it
   runs this change, whatever the manifest says.
5. **Remove the flag from the remote manifest**, once the change from step 4 has reached every
   Ghost(Pro) server. Until then, Admin already offers the type everywhere, and a server still
   on the release before needs the flag on to create it.

Until step 4, a type can be taken back by setting its flag to `false` in the remote manifest.
Nobody can create a new field of it, except on a site that sets the flag in its own config,
which wins over the manifest, and fields already created keep working. Admin tabs that
are already open pick up the change when they are reloaded. Do the same if Ghost(Pro) servers
are rolled back to a release without the type's code, as Admin would otherwise offer a type
those servers can't store. Such a server also leaves fields of the type, and members' answers
to them, out of everything it reads, though nothing is deleted: they come back once the servers
run a release with the type's code again.
