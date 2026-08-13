# Authentication

Ghost has three entities that are used for authentication across its APIs:

- Staff users — Admin API
- Integrations — Admin API and Content API
- Members — Members API

Staff users and integrations are completely separate from members. They use
different authentication schemes and do not have unified access across the
APIs. For example, staff users cannot access authenticated Members API comment
routes.

## Staff users

The primary authentication method for staff users is an email and password pair
with a long-lived cookie. By default, signing in from an unrecognised browser
triggers a two-factor authentication requirement. Ghost sends a one-time code by
email that must be entered to complete sign-in.

A staff user can alternatively authenticate with their unique Staff Access
Token.

API documentation:

- [Staff API](https://docs.ghost.org/staff)
- [Admin API authentication](https://docs.ghost.org/admin-api#authentication)
- [Staff access token authentication](https://docs.ghost.org/admin-api#staff-access-token-authentication)

## Integrations

API documentation:

- [Admin API token authentication](https://docs.ghost.org/admin-api#token-authentication)
- [Content API key authentication](https://docs.ghost.org/content-api#key)

## Members

WIP. Members authentication uses magic link emails.
