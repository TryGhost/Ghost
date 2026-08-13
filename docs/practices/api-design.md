# API Design

Ghost's APIs are mature and widely used. There is no need for a wholesale
redesign; follow the established principles and patterns carefully, and add new
patterns only when existing ones do not serve API consumers.

## Principles

### Postel's Law

> Be conservative in what you send, and liberal in what you accept.

Ghost APIs are used by many different apps and integrations. Be flexible about
useful input while keeping responses specific and predictable.

Being liberal in what we accept does not mean accepting arbitrary properties.
For example, a caller should be able to pass a resource returned by `read` back
to `edit`; known non-writable fields can be ignored. A misspelled field such as
`member: {naem: "John"}` is not useful input and should produce an error rather
than being silently ignored.

### Hyrum's Law

> With a sufficient number of users of an API, every observable behaviour will
> be depended on by somebody.

Every detail can become part of the API contract. Ask “should we add this?” and
weigh the value of new behavior against its long-term compatibility and
maintenance cost.

Good API design balances these principles: preserve useful flexibility for
callers without making outputs or behavior accidental and unpredictable.

## Patterns

Ghost's HTTP APIs follow RESTful principles. REST and JSON:API provide useful
CRUD patterns for top-level resources such as posts and members, although less
standard operations such as file uploads and bulk changes need additional
patterns.

The following conventions should hold:

- Use HTTP methods according to the action being taken.
- Define endpoints as resources or nouns.
- Request and response bodies represent the resource under a top-level key:

  ```json
  {
      "members": [],
      "meta": {}
  }
  ```

- Resource bodies use a top-level key containing an array, including singular
  requests. Settings use the same shape, with each key-value pair represented
  as a resource in the array.
- Responses can include a top-level `meta` key for additional information.
- Pagination metadata is nested under `meta.pagination`:

  ```json
  {
      "members": [],
      "meta": {
          "pagination": {
              "page": 3,
              "prev": 2,
              "next": null,
              "limit": 15,
              "total": 38,
              "pages": 3
          }
      }
  }
  ```

- Use `snake_case` for API resource names and keys.

### Working with files

File endpoints such as `/images/upload` break the normal noun-only pattern. A
file-interaction convention using an action such as `upload` has become
established and should remain limited to file operations rather than being
copied for ordinary data interactions.

### Bulk endpoints

Ghost uses `/bulk` as a nested resource for bulk operations such as
`/members/bulk`. Define the request body and app behavior carefully before
adding another bulk endpoint.

## Conventions

### Function signatures and API calls

The HTTP API should map closely to the SDK and internal package APIs, including
function signatures and parameters. For example, a call such as
`api.posts.browse({filter, fields})` maps those options to a `GET` request for
the posts resource with `filter` and `fields` query parameters.

### Graceful passing of objects

Internal and HTTP APIs should return and accept a common resource format. A
caller should be able to pass the result of `read` or `GET` directly to the
corresponding `edit` or `PUT` operation without first removing read-only fields.

### Caching and cache invalidation

API endpoints use middleware to set `Cache-Control`. Design every response on
the assumption that a greedy cache can exist in front of Ghost.

Mutation responses can include an `X-Cache-Invalidate` header telling callers
which paths need to be purged. Cache behavior must be deliberate for every API
response.

### Allowlist resource properties

Prefer allowlists for API resource properties. Use the allowlist to ignore known
but non-writable input properties while stripping properties that should not be
sent in responses. Do not rely on a blocklist that must be updated every time a
new internal property is added.

## Settings

Settings values can be strings, numbers, booleans, arrays, or objects. Object
settings are used for a small number of structured values and should not be the
default for new settings.

Settings keys:

- Use `snake_case`.
- Be descriptive and unique.
- Match the name exposed by the API where the key is public.

The `type` field declares the type stored in `value`. The `group` field collects
settings that are fetched and updated together. Groups and flags control which
settings are exposed through the Admin and Content APIs, so follow an existing
setting with the same intended exposure.

## Permissions

Permission checks run after input serialization and before the controller query.
Permissions are associated with a resource name (`docName`) and method, with
their role assignments stored in the permissions and roles tables.

An endpoint's permission configuration can be:

- An object using the database permission, with optional overrides for `method`,
  `docName`, and writable `unsafeAttrs`.
- `true` to use the database permission.
- `false` to skip the permission stage.
- A function for exceptional custom logic. It should throw a
  `NoPermissionError` to deny access and should not replace normal permission
  configuration without a specific reason.

Adding or changing a database-backed permission requires updates to fixtures, a
database migration, fixture tests, and the database integrity hash.

## Future design

Ghost's API design can continue to evolve. REST can produce awkward affordances
for actions: publishing a post is a `PUT` to `/posts/:id/` and looks the same as
changing its title. New patterns should solve a demonstrated consumer problem
without discarding the compatibility and consistency of the existing APIs.
