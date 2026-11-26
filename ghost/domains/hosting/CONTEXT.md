# Hosting

The site's dealings with whoever hosts it or supplies the software.

Most of it still lives in `ghost/core`. What is here has moved in and been reshaped.

## Owns

- Asking the host to generate an export of the site.
- Email verification: deciding when the host must review the site before it may send
  email, from how many members arrive and who newsletters went to.

Sending the verification webhook has not moved in yet. It is asked for through
`ghost/shared/transition`.

## Words

- **Verified**: the host has reviewed the site's email sending. It is set in config.
- **Verification required**: a threshold was passed and the host was told. It is a setting.

## What other code may use

- `actions/`: what other code may ask this domain to do.

## Where things are

- `provider.ts` lists what the application must call here: a listener for members being created.
- `services/` and `repositories/` hold the rest. Each class has a builder beside it that
  makes it for a site.

Legacy members and email code is not handed the site, so boot makes the email
verification actions for the site and hands them to the members service.
