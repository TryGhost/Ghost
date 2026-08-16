# Error Handling

Errors are part of the product experience. Design them with the same care as
the success and loading states around them. A person using Ghost should never
see an error that has simply bubbled up from code.

Our preferred fallback message is:

> An unexpected error occurred, please try again.

Use that fallback when there is no safe, useful message. A specific recovery
path is better whenever the application understands what went wrong.

## Error scenarios

There are three places where people encounter errors:

1. **Logs** are for people investigating a failure. Include the technical detail
   needed to find and solve the problem: the original error, stack, error ID,
   and relevant context. Logs should still help the reader understand what to do
   next.
2. **API responses** are for code and developers. Return a consistent status and
   structured error so callers can decide whether to retry, change the request,
   or surface a failure. Include enough information to solve the problem without
   exposing secrets or unsafe dependency details.
3. **User interfaces** are for people trying to complete a task. Admin, Portal,
   and Ghost CLI own the whole interaction: success, waiting, recovery, and
   failure. Tell the person what happened in their terms and what they can do
   next. Hide technical detail unless there is a deliberate reason to show it.

The same failure should not necessarily use the same copy in all three places.
An API consumer may need a type and code; someone publishing a post needs to
know whether to retry, fix an input, or get help.

As a user navigating a product, I click a button to create a new post. The app
I'm using should understand that I have no technical recourse. The code handling
that interaction is responsible for triggering the success flow, the waiting
state, or a useful error state such as “Post could not be published” with an
option to retry or get help. Admin is responsible for my experience whether I'm
succeeding, waiting, or failing. That's the UX.

## Ghost's error format

Ghost errors have three main fields for explaining a failure:

1. **`message`** is the main summary of what went wrong. It should make sense on
   its own and describe the failed Ghost operation, not repeat a raw database,
   JavaScript, network, or third-party error.
2. **`context`** explains why or where the operation failed. Decode the
   lower-level failure into useful, specific context rather than copying an
   unknown error message. Do not include secrets, stack traces, or unsafe
   dependency details.
3. **`help`** tells the reader what to do next. Use a concrete next step or a
   stable URL that explains how to solve the problem. Do not add generic help
   text that gives the reader no useful action.

When deliberately constructing a server error, consider all three fields. Set
each one when it adds distinct, useful information; do not make `context` or
`help` repeat the `message`.

Ghost errors can also include:

- `code` for a specific, stable case a caller needs to detect.
- `property` for the input associated with a validation error.
- `errorDetails` for structured details required by a particular caller.
- `err` to retain the original error and stack for diagnosis.

### Logs

A properly curated error in logs includes the full `message`, `context`, and
`help`, where available. It also includes the original error and stack, plus an
ID and readable code when those exist, so someone can find and diagnose the
failure.

### API responses

Ghost's JSON API renderer returns an `errors` array:

```json
{
    "errors": [{
        "message": "The email service received an error and was unable to send.",
        "context": "The email provider rejected the request.",
        "type": "EmailError",
        "details": null,
        "property": null,
        "help": "https://ghost.org/docs/newsletters/#bulk-email-configuration",
        "code": "BULK_EMAIL_SEND_FAILED",
        "id": "...",
        "ghostErrorCode": null
    }]
}
```

The HTTP status and `type` describe the general failure. Use `code` for a
specific case. Do not make programmatic decisions by comparing message text.

Unexpected errors are wrapped before the API response is rendered. The API uses
the generic fallback for the message while retaining the original error for
diagnosis.

### User interfaces

Do not show the API response by default. Choose what to show based on the error,
the context, what the person can do next, and what the application can do to
recover. The UI is responsible for turning a technical failure into a designed
experience.

## Returning errors from the server

When server code deliberately creates an error, use the classes from
`@tryghost/errors`. Choose the class that represents the failure; it supplies
the general error type and HTTP status.

```javascript
throw new errors.EmailError({
    err,
    message: tpl(messages.sendFailed),
    context: tpl(messages.providerRejectedRequest),
    help: 'https://ghost.org/docs/newsletters/#bulk-email-configuration',
    code: 'BULK_EMAIL_SEND_FAILED'
});
```

In this example:

- `message` describes the failed Ghost operation.
- `context` is set by actively decoding the email provider's response.
- `help` points to the configuration needed to resolve the failure.
- `err` retains the original provider error for logs and diagnosis.
- `code` gives callers a readable, searchable way to identify the case.

Pass the original failure as `err`, but do not copy raw database errors, stack
traces, secrets, or unknown third-party responses into `message`, `context`, or
`help`.

Keep reusable server error strings in a `messages` object and render them with
`tpl()`.

## Showing errors in a user interface

Start with the action the person was trying to complete:

- Can the application recover or retry without asking them to do anything?
- Is there a validation problem the UI can explain beside the relevant field?
- Is there a dedicated workflow for the case, such as re-authentication,
  maintenance, or a version mismatch?
- Can the person retry safely? If so, make retrying easy.
- If they cannot resolve it themselves, is there a useful way to get help?

Write a specific message after deciding the recovery behavior. Error copy
without a recovery path is rarely enough.

For example, saving a tier could fail because:

1. The input does not pass validation.
2. The tier no longer exists.
3. The site has reached its tier limit.
4. The server is down for maintenance.
5. The API returns another known, specific error.
6. The person logged out in another tab.
7. The request times out or the network is unavailable.
8. The API returns an unknown or malformed response.

Handle each group deliberately:

- **Validation:** implement expected validation in the UI and show the error
  beside the relevant field. If normal UI input causes an API validation error,
  treat that as a gap in the interaction and use a designed fallback.
- **Known API failures:** handle known cases such as a missing tier, a limit, or
  maintenance with a specific recovery path. Only show an API message when the
  endpoint and exact error case deliberately return user-facing copy.
- **Authentication:** use the application's dedicated logged-out or
  re-authentication workflow.
- **Network failures:** retry when it is safe, then show the generic fallback if
  the request still cannot complete.
- **Unknown failures:** do not trust the response. Show the generic fallback and
  retain or report the underlying error for diagnosis.

Prefer an explicit decision at the workflow boundary:

```javascript
if (isKnownRecoverableError(error)) {
    showRecoveryFor(error);
} else if (isTrustedUserFacingError(error)) {
    showError(error.message);
} else {
    showError('An unexpected error occurred, please try again.');
}
```

Do not assume every error of a broad type is safe because one endpoint returns a
carefully written example. Codes are more precise than message matching when a
caller must identify a specific case.

Some legacy UI paths still pass API messages through catch-all helpers such as
Ember Admin's `showAPIError`. Treat those as existing behavior, not the pattern
for new work. New and updated interactions should handle expected errors close
to the workflow.

Translate user-facing error copy using the
[internationalization guide](internationalization.md).

## Testing error handling

Test the designed behavior at each relevant boundary:

- Server tests assert the error type, HTTP status, code, and any fields the
  caller relies on.
- UI tests cover the expected recovery path, any deliberately trusted API
  message, and the generic fallback for an unknown or malformed error.
- Tests prove that raw technical errors do not reach the UI.

The goal is not only to prove that an error appears. Prove that the person can
understand what happened and take the intended next step.
