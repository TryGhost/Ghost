# Error Handling

An error has three audiences: developers investigating it, code responding to
it, and the person using Ghost. Handle each audience deliberately. Keep the
technical detail needed for diagnosis, return a stable API error, and show a
clear message with a useful next step.

## Ghost Core

Use the error classes from `@tryghost/errors` at server boundaries. Choose the
class that represents the failure; its type and HTTP status become part of the
API contract.

```js
const errors = require('@tryghost/errors');

throw new errors.ValidationError({
    message: 'Please enter a valid email address.',
    property: 'email',
    code: 'INVALID_EMAIL'
});
```

Ghost errors support these fields:

| Field | Purpose |
| --- | --- |
| `message` | Short, user-readable description of the failure |
| `context` | Extra information about what failed |
| `help` | A useful next step |
| `code` | Stable identifier for code that needs to handle this case |
| `property` | Input field associated with a validation failure |
| `errorDetails` | Structured details needed by a specific API consumer |
| `err` | Original error, retained for diagnosis |

Pass the original error as `err` when wrapping a dependency or lower-level
failure. Do not expose database errors, stack traces, secrets, or raw responses
from another service in user-facing fields. Unexpected errors are converted to
a generic internal server error before they reach the API.

## API responses

Ghost API errors use an `errors` array:

```json
{
    "errors": [{
        "message": "Please enter a valid email address.",
        "context": null,
        "type": "ValidationError",
        "details": null,
        "property": "email",
        "help": null,
        "code": "INVALID_EMAIL",
        "id": "..."
    }]
}
```

The HTTP status and error `type` describe the general failure. Use `code` when
a caller needs to distinguish a specific case. Messages explain the problem to
people and can change, so do not use message text as a programmatic identifier.

When changing an API error, consider existing callers. Changing its status,
type, code, or field shape can be a compatibility change even when the success
response is unchanged.

## User interfaces

Handle expected failures close to the action that caused them. A useful error
message says what happened and, where possible, what the person can do next.
Translate user-facing copy using the
[internationalization guide](internationalization.md).

Only display a server message when that endpoint deliberately returns copy that
is safe for the user. Do not show raw JavaScript errors or unknown dependency
messages. Use the established generic fallback when there is no trusted message:

> An unexpected error occurred, please try again.

Preserve the original error for diagnostics even when the UI shows a simpler
message. Known global cases such as maintenance or a version mismatch should use
their dedicated UI rather than a generic notification.

## Testing errors

Test both sides of an error boundary:

- Server tests should assert the error type, HTTP status, code, and any fields
  the caller relies on.
- UI tests should cover the expected recovery path and the generic fallback for
  an unknown error.
- Do not only assert message text when the behavior depends on a stable code or
  type.

Keep tests focused on the contract that matters to the caller. Internal stack
traces and logging metadata are diagnostic details, not API contracts.
