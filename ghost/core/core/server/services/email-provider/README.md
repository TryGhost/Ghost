# Email providers

Ghost loads one bulk email provider through AdapterManager at boot. Mailgun is
the default and the only bundled provider. The
[adapter contract](../../../../../../packages/adapters/email-base/README.md)
defines sending, suppression removal, and polling or webhook event sources.

## Configuration

Mailgun keeps its existing config and Admin settings. Install another adapter in
`content/adapters/email` and select it through AdapterManager:

```json
{
  "adapters": {
    "email": {
      "active": "ExampleProvider",
      "ExampleProvider": {"source": "example"}
    }
  }
}
```

`ExampleProvider` is illustrative. Its `source` identifies the webhook endpoint:
up to 64 lowercase letters, digits, underscores or hyphens, starting with a letter
or digit. Ghost does not store provider ownership on sends or support overlapping
provider migrations.

## Sending

- Newsletters keep their rendering, recipient batching and retries in `email-service`.
- The existing `mailgun_message_id` columns store provider IDs without changing
  case, punctuation or brackets. Only the adapter normalizes its provider's IDs.

## Events

Mailgun keeps its schedules, tag filters, cursors and aggregation lifecycle.
Analytics obtains events through the active provider's declared event source.
