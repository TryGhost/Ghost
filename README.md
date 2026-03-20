# Zombie

> **This is a fork of [Ghost](https://github.com/TryGhost/Ghost)**, the brilliant open source publishing platform. We renamed it to avoid any confusion — "Ghost" is their name, not ours, and we’re not using it with their permission. This fork adds Bluesky/AT Protocol integration (OAuth login, bidirectional comment sync, post-as-user). We’d love for the Ghost team to take this work back upstream if it’s useful to them.

&nbsp;
<p align="center">
  <a href="https://ghost.org/#gh-light-mode-only" target="_blank">
    <img src="https://user-images.githubusercontent.com/65487235/157884383-1b75feb1-45d8-4430-b636-3f7e06577347.png" alt="Ghost" width="200px">
  </a>
  <a href="https://ghost.org/#gh-dark-mode-only" target="_blank">
    <img src="https://user-images.githubusercontent.com/65487235/157849205-aa24152c-4610-4d7d-b752-3a8c4f9319e6.png" alt="Ghost" width="200px">
  </a>
</p>
&nbsp;

<p align="center">
    <a href="https://ghost.org/">Ghost.org</a> •
    <a href="https://forum.ghost.org">Forum</a> •
    <a href="https://ghost.org/docs/">Docs</a> •
    <a href="https://github.com/TryGhost/Ghost/blob/main/.github/CONTRIBUTING.md">Contributing</a> •
    <a href="https://twitter.com/ghost">Twitter</a>
</p>

&nbsp;

## What Zombie adds

- **Bluesky OAuth login** for members — sign in with your Bluesky handle via AT Protocol OAuth 2.1 (DPoP + PKCE)
- **Progressive scope upgrade** — login with minimal permissions (`atproto`), upgrade to write access (`atproto transition:generic`) when the user wants their comments to post as themselves on Bluesky
- **Bidirectional comment sync** — Ghost comments post to linked Bluesky threads, Bluesky replies sync back as Ghost comments (with threading)
- **Post-as-user** — members with write scope have their comments posted from their own Bluesky account, not the blog’s
- **Graceful scope handling** — if a user revokes access, the system detects it, falls back to the blog account, and shows the upgrade prompt again

See the [blog post](https://demos.linkedtrust.us/blog/at-proto-oauth-with-progressive-scope-upgrade-a-how-to/) for a detailed walkthrough of the implementation and the gotchas we hit.

### Key files

- `ghost/core/core/server/services/atproto-oauth/` — OAuth client, callback, session restore, scope upgrade
- `ghost/core/core/server/services/bluesky-sync/` — bidirectional comment sync
- `apps/comments-ui/src/components/content/forms/main-form.tsx` — upgrade prompt + Bluesky discussion link

&nbsp;

---

*Everything below is from the original Ghost README.*

&nbsp;

> [!NOTE]
> Love open source? Ghost is looking for staff engineers to [join the team](https://careers.ghost.org) and work full-time

<a href="https://ghost.org/"><img src="https://user-images.githubusercontent.com/353959/169805900-66be5b89-0859-4816-8da9-528ed7534704.png" alt="Fiercely independent, professional publishing. Ghost is the most popular open source, headless Node.js CMS which already works with all the tools you know and love." /></a>

&nbsp;

<a href="https://ghost.org/pricing/#gh-light-mode-only" target="_blank"><img src="https://user-images.githubusercontent.com/65487235/157849437-9b8fcc48-1920-4b26-a1e8-5806db0e6bb9.png" alt="Ghost(Pro)" width="165px" /></a>
<a href="https://ghost.org/pricing/#gh-dark-mode-only" target="_blank"><img src="https://user-images.githubusercontent.com/65487235/157849438-79889b04-b7b6-4ba7-8de6-4c1e4b4e16a5.png" alt="Ghost(Pro)" width="165px" /></a>

The easiest way to get a production instance deployed is with the official **[Ghost(Pro)](https://ghost.org/pricing/)** managed service. It takes about 2 minutes to launch a new site with worldwide CDN, backups, security and maintenance all done for you.

For most people this ends up being the best value option because of [how much time it saves](https://ghost.org/docs/hosting/) — and 100% of revenue goes to the Ghost Foundation; funding the maintenance and further development of the project itself. So you’ll be supporting open source software *and* getting a great service!

&nbsp;

# Quickstart install

If you want to run your own instance of Ghost, in most cases the best way is to use our **CLI tool**

```
npm install ghost-cli -g
```

&nbsp;

Then, if installing locally add the `local` flag to get up and running in under a minute - [Local install docs](https://ghost.org/docs/install/local/)

```
ghost install local
```

&nbsp;

or on a server run the full install, including automatic SSL setup using LetsEncrypt - [Production install docs](https://ghost.org/docs/install/ubuntu/)

```
ghost install
```

&nbsp;

Check out our [official documentation](https://ghost.org/docs/) for more information about our [recommended hosting stack](https://ghost.org/docs/hosting/) & properly [upgrading Ghost](https://ghost.org/docs/update/), plus everything you need to develop your own Ghost [themes](https://ghost.org/docs/themes/) or work with [our API](https://ghost.org/docs/content-api/).

### Contributors & advanced developers

For anyone wishing to contribute to Ghost or to hack/customize core files we recommend following our full development setup guides: [Contributor guide](https://ghost.org/docs/contributing/) • [Developer setup](https://ghost.org/docs/install/source/)

&nbsp;

# Ghost sponsors

A big thanks to our sponsors and partners who make Ghost possible. If you're interested in sponsoring Ghost and supporting the project, please check out our profile on [GitHub sponsors](https://github.com/sponsors/TryGhost) :heart:

**[DigitalOcean](https://m.do.co/c/9ff29836d717)** • **[Fastly](https://www.fastly.com/)** • **[Tinybird](https://tbrd.co/ghost)**

&nbsp;

# Getting help

Everyone can get help and support from a large community of developers over on the [Ghost forum](https://forum.ghost.org/). **Ghost(Pro)** customers have access to 24/7 email support.

To stay up to date with all the latest news and product updates, make sure you [subscribe to our changelog newsletter](https://ghost.org/changelog/) — or follow us [on Twitter](https://twitter.com/Ghost), if you prefer your updates bite-sized and facetious. :saxophone::turtle:

&nbsp;

# License & trademark

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
