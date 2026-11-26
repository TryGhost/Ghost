# Apps

How software other than Ghost connects to a site.

## Owns

- Custom integrations and the rules for their keys.
- Built-in connections to the publisher's own tools, such as Slack.

Installed apps and webhooks belong here too. They have not moved in yet.

## Does not own

- Storing, rotating and checking keys. That is shared auth.
- Connections to other publications and networks. That is the network domain.
- Publishing a post. Apps reacts to the published event; it does not decide it.

## Words

- **Integration**: a named connection a publisher creates, with its own API keys and webhooks.
- **Slack ping**: a message posted to the publisher's Slack webhook when a post is published.

## What other code may use

- `actions/`: what other code may ask this domain to do.

## Where things are

- `provider.ts` lists what the application must call here: the listeners.
- `actions/` and `listeners/` hold the logic: one file per thing the domain does.
- `services/` holds only logic that several of those share.
