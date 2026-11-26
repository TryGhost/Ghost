# Network

The site's connections to other sites and networks.

## Owns

- Recommendations: the sites this one recommends, and the sites that recommend it.

Mentions, ActivityPub, the Explore ping and the IndexNow ping belong here too.
They have not moved in yet.

## Does not own

- Describing an external page from its address. That is publishing; this domain asks it.
- Tools a publisher connects for their own use. That is the apps domain.

## Words

- **Recommendation**: another site this one tells its readers about.
- **Incoming recommendation**: another site recommending this one. It arrives as a webmention.

## What other code may use

- `actions/`: what other code may ask this domain to do.
- `events/`: things that happened here, which others may listen to.

## Where things are

- `provider.ts` lists what the application must call here: a listener and two jobs.
- `http/` holds the controllers the API and the site call.
- `services/`, `repositories/`, `entities/` and `emails/` hold the rest. Each class has a
  builder beside it that makes it for a site.
