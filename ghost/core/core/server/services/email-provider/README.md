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
- Automations and gift delivery use the shared single-recipient transport.
  Automations keep their status and Updates & Announcements eligibility checks;
  `email_disabled` alone does not end a step. Webhook providers check local
  suppression before either kind of send. A blocked automation step or gift delivery
  is marked failed without retrying the send. Polling providers keep their existing
  sending behavior.
- Gifts fall back to GhostMailer when bulk email is unconfigured. Buyer notices,
  login messages and the older welcome-email flow also use GhostMailer.

An accepted automation send without a tracking ID completes without delivery/open
tracking. Configured bulk gift delivery still requires an ID. Unconfigured Mailgun
keeps its legacy automation no-op: no send, no tracking ID, and no retry.

- The existing `mailgun_message_id` columns store provider IDs without changing
  case, punctuation or brackets. Only the adapter normalizes its provider's IDs.

## Events

Mailgun keeps its schedules, tag filters, cursors and aggregation lifecycle.
Analytics obtains events through the active provider's declared event source.
