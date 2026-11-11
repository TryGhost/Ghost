# Ghost Apps agent guidance

While `apps` is in `PRIVATE_FEATURES` (`ghost/core/shared/labs.js`), this code
and `admin-x-framework`'s app API hooks build against a matching Core only,
with no older-Core fallbacks or tests. Origin, framing, identity and allowlist
checks still apply.
