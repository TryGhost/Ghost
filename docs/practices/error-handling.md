# Error Handling

> Our preferred fallback message is: **“An unexpected error occurred, please
> try again.”**

Ghost is complex software, a lot of things can go wrong, and they often do. For
our customers and users, how we handle errors when things go wrong is a huge
part of their experience.

Well handled errors can be a positive experience, poorly handled errors are a
terrible experience. Therefore all errors that a user could ever see should be
carefully crafted. Users should never see errors that have bubbled up from code.

## Error scenarios

There are three scenarios in which a user of our systems could encounter an
error:

1. **Logs** - users who are accessing logs are likely technical. They're looking
   for all the dirty details of what went wrong, so it's safe to include those
   here. Still no one looks at logs for fun, the reader is trying to solve a
   problem, we should try to help them.
2. **API responses** - users who see API responses are probably developers, or
   more technical people. As they're interacting with a technical system, there
   is more tolerance and expectation for technical details in errors. Still,
   when something is wrong, the aim is to inform the viewer how to solve the
   problem.
3. **User interfaces** - Admin, Portal, even Ghost CLI are user interfaces. The
   users here are assumed to be non-technical, so errors here should be very
   well considered, designed even, to tell the user what they can do next to
   solve the problem. Technical details should be hidden unless we make
   deliberate exceptions.

For example, as a developer writing code, I make an API request to create a
post. The API responds “error: post creation failed”. As a developer, I now
decide what to do with that information programmatically. I can try again
automatically, fix a bug in my code, or hunt in the logs for more detail.

As a user navigating a product, I click a button to create a new post. The app
I'm using should understand that I have no recourse. The code that handles what
happens when this button is clicked is responsible for triggering the success
flow, the waiting state, or an error state such as “Post could not be published,
[retry?] or [get help]”. The Admin app is responsible for my experience, whether
I'm succeeding, waiting, or failing. That's the UX.

## Ghost's error format

Since Ghost's inception, we've used our own format for displaying errors. Each
error is made up of three main parts:

1. **Message** - the main message explaining what has gone wrong.
2. **Context** - any details, the why or where, or the original message from a
   third party.
3. **Help** - either a step to take or a URL to visit to solve the problem.

### Logging

A properly curated error in logs gives a full message, context, and help. It has
an ID from the API and a code, making it easier to find, and includes the stack
trace.

### API

The same error returned from the API would look like this:

```json
{
    "errors": [{
        "message": "The email service received an error and was unable to send.",
        "context": "The email provider rejected the request.",
        "help": "https://ghost.org/docs/newsletters/#bulk-email-configuration",
        "type": "EmailError",
        "code": "BULK_EMAIL_SEND_FAILED",
        "id": "211167d0-6519-11ed-90e5-49976581c6bb",
        "property": null
    }]
}
```

### User interface

The user interface should not be showing these messages. In almost all cases,
we want to make careful choices about what we show the user, based on the error,
the context, what recourse the user has, and what recourse the application has
to help fix the problem.

## Designing errors

### Returning errors from the API or server

The `@tryghost/errors` package has tooling for creating errors in Ghost's error
format, and where we need it we should add more. Whenever you're actively
choosing to create an error in server-side code, it should use this format.

```javascript
const ghostError = new errors.EmailError({
    err,
    message: tpl(messages.error),
    context: `Email provider error ${err.error.status}: ${err.error.details}`,
    help: 'https://ghost.org/docs/newsletters/#bulk-email-configuration',
    code: 'BULK_EMAIL_SEND_FAILED'
});
```

- Message, context, and help are all set.
- Context is set by actively decoding the error from the email provider.
- We do not include the full original message from the provider; we process the
  error into our format.
- We add a code that is readable and searchable.

Error strings should be kept in a `messages` object and rendered with `tpl()`.

### Showing errors to users

When we are designing interactions in Admin, Portal, or any other UI, we should
for the most part handle any and all errors and do something specific with
them—for example retrying, or writing a custom error message to display to the
user.

Let's take an example of saving a tier. We could get any of the following errors
from the API:

1. A validation error with specifics.
2. Tier not found (404).
3. A host limit error if the user has reached the maximum number of tiers.
4. Server down for maintenance.
5. Other genuine, specific API errors.
6. An auth error if the user logged out in a different tab.
7. The API might not respond at all; we could get a network or timeout error.
8. The API could be broken and return garbage.

- For case 1, we should implement all validations in the UI and show our own
  errors. If we are getting a validation error from the API, something went very
  wrong. We should have a special custom error message for this case, and detect
  and fix these issues through error monitoring.
- For cases 2–5, we may already return specific and carefully crafted errors
  from the API. When we know this is true and can detect these based on the error
  type, it is acceptable to display the API error if custom handling does not
  make more sense. We need to review these regularly to ensure other messages
  have not crept into a trusted error type.
- Case 6 is special: the application should have a dedicated workflow for
  logged-out users.
- For case 7, handle errors while interacting with the API with a retry, then
  fall back to a generic message.
- For case 8, if we do not trust the API message, replace it with the generic
  fallback.

When we decide to show an error message to the user, we should ensure it has
been designed.

If we need to show a generic error message but the underlying error has an ID
from the server, output that error to the console.

## Direction

- Only show API errors in a UI when we are certain they are safe and useful to
  show.
- Reduce reliance on catch-all API error notifications in favour of custom error
  handling and recovery for specific workflows.
- Unify top-level error handling into a sensible system of fallbacks.
- Never render an error that came from another part of the code we do not trust.

The preferred generic fallback is:

> An unexpected error occurred, please try again.
