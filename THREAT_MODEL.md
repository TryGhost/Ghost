# Overview

Ghost is a self-hostable Node.js publishing platform and headless CMS. The main production runtime is Ghost Core under `ghost/core/`: an HTTP server, Admin and Content APIs, server-rendered themes, persistence, background jobs, email/newsletter delivery, memberships, comments, analytics, and integrations. The repository also builds the React and legacy Ember Admin clients, public browser applications such as Portal and Comments UI, the Koenig editor and renderers, and shared packages and adapter contracts. `docs/codebase/monorepo-structure.md` and `ghost/core/core/server/services/README.md` describe these production boundaries; tests, documentation, local Docker services, and most repository scripts are supporting rather than primary runtime surfaces.

The assets that matter most are:

- staff accounts, roles, sessions, Staff Access Tokens, integration API keys, member sessions, and signing secrets;
- unpublished, paid, members-only, scheduled, or email-only content and the rules that decide who can receive it;
- member identity, subscription, billing, engagement, email-recipient, and attribution data described in `docs/codebase/database.md`;
- publication integrity, including posts, pages, themes, routes, redirects, settings, integrations, webhooks, newsletters, and scheduled jobs;
- payment state and Stripe credentials, webhook authenticity, products, prices, offers, and entitlements;
- host resources and credentials available to the Ghost process, including its database, content storage, configuration, mail provider, caches, job runners, and network position;
- the integrity of browser bundles and rendered HTML delivered to staff, members, and anonymous visitors.

Repository-wide security objectives are to preserve identity separation, authorize every privileged state change, prevent private content or personal data from crossing access boundaries, render attacker-influenced content safely, constrain file and archive handling, prevent attacker-selected outbound requests from reaching protected networks, authenticate inbound third-party events, protect secrets, and keep untrusted input from exhausting shared runtime resources.

# Threat Model, Trust Boundaries, and Assumptions

## Actors and boundaries

1. **Anonymous Internet users to public HTTP surfaces.** Visitors can request rendered pages, assets, feeds, search data, Content API resources, member sign-in and checkout flows, comments, recommendations, webmention endpoints, redirects, and other public routes. All request paths, methods, headers, query strings, cookies, bodies, uploaded bytes, and URL-like values reaching these surfaces are attacker-controlled.

2. **Members to member-scoped state.** Members authenticate through passwordless links or one-time codes and signed cookies, then may receive identity or entitlement tokens. They may control profile data, comments, feedback, subscription actions, return URLs, and other member inputs. A member is not a staff user or integration, and one member must not read or mutate another member's private state. Paid or gated content decisions must be enforced server-side rather than trusted to Portal, Comments UI, or another browser bundle.

3. **Staff browsers to the Admin API.** Staff use a server-side Admin session or a Staff Access Token. Staff roles are not equivalent: authentication must be followed by the endpoint's permission check, and highly sensitive owner/account actions may require stronger restrictions. The Admin and Ghost Core can deploy independently, so security must not depend on a newer client hiding a control from an older server or vice versa (`apps/admin/README.md`).

4. **Integrations to the APIs and event system.** Admin API integration JWTs, Content API keys, staff tokens, and session cookies are distinct credential classes. Content API keys are public identifiers by design and cannot protect secrets. Integration Admin tokens are expected to be short-lived and restricted to allowlisted endpoint/method combinations. Webhook secrets protect message authenticity for consumers, while webhook target URLs cross from Ghost into an external network.

5. **Ghost to persistence and host services.** The process trusts configured database, storage, cache, scheduling, jobs, mail, analytics, and redirect adapters to implement their contracts. Compromise of the database administrator, filesystem owner, container/host root, or a deliberately malicious adapter is generally outside the application's protection boundary. Code must still avoid turning ordinary HTTP input into arbitrary database queries, paths, adapter selection, configuration reads, or host commands.

6. **Ghost to external services.** Stripe, mail providers, Tinybird, CDNs, GitHub theme downloads, oEmbed providers, ActivityPub services, webmention sources, recommendation targets, update services, and operator-configured webhooks sit outside the process. Their responses, redirects, certificates, timing, size, content type, and availability cannot be assumed benign. Inbound Stripe events require signature verification; outbound destinations need scheme, redirect, DNS/IP, timeout, and size controls appropriate to the call.

7. **Publisher content and themes to visitor/staff browsers.** Staff-authored HTML, imported content, comments, embeds, theme templates, custom CSS, navigation, metadata, and public-app configuration may be rendered into HTML, JSON, email, or DOM contexts. A publication owner is trusted to control their site's presentation, but lower-privileged staff, members, import files, and remote metadata must not gain unintended script execution or access to Admin credentials. Theme code should not become server-side arbitrary code merely because an authorized operator uploads a theme.

8. **Build and release outputs to deployments.** Admin, public apps, Koenig packages, shared packages, and compiled Ghost Core artifacts are built in this monorepo and sometimes published to npm/CDNs or embedded in a Ghost release. CI credentials and package publication are privileged supply-chain surfaces, but local developer scripts and test fixtures are secondary unless an attacker can influence inputs consumed by a privileged CI/release workflow.

## Input ownership

- **Attacker-controlled:** unauthenticated and member HTTP input; public API filters and identifiers; cookies and authorization headers presented by a client; comments and profile fields; uploaded/imported file contents; external URLs submitted to reachable features; remote HTTP/DNS responses; webmention and ActivityPub payloads; unsigned webhook bodies; and stored content originally supplied by an untrusted actor.
- **Operator-controlled:** production configuration and secret files; enabled adapters and feature flags; trusted proxy and site URL settings; SMTP, database, storage, Stripe, analytics, and CDN credentials; staff-created integrations and webhook targets; themes and route files installed by an authorized owner; and deliberate opt-ins such as permitting webhook access to internal IPs.
- **Developer/release-controlled:** source, dependency catalog, migrations, build configuration, generated bundles, release workflows, and test fixtures. These become attacker-controlled only where an external contributor, compromised dependency, artifact, or pull request can reach a privileged workflow.

## Core assumptions and invariants

- Staff, integrations, and members remain non-interchangeable identities; parsing a valid credential never implies authorization for every route.
- Sessions and tokens are bound to the intended user/key, API audience, origin where applicable, expiry, and current account/key state. Authentication reset, ownership transfer, and account deletion must invalidate or reject stale authority.
- API permissions, integration allowlists, writable-property allowlists, and object ownership checks apply to every alternate route and HTTP method, including bulk, import/export, scheduler, and token-in-URL paths.
- Draft, scheduled, email-only, paid, and members-only content cannot appear through public APIs, caches, feeds, previews, search indexes, analytics, or error responses without the required entitlement.
- User-controlled paths, filenames, archive entries, redirects, and URLs cannot escape their intended storage, origin, or network boundary. Redirect chains and DNS resolution must not bypass outbound-request restrictions.
- Rendered HTML, attributes, JSON, email, and DOM updates apply context-appropriate escaping or narrowly reviewed sanitization. `SafeString`, triple-curly Handlebars output, custom HTML, and raw editor cards are privileged sinks, not proof that input is safe.
- Billing and entitlement state changes derive from an authenticated provider event or a correctly authorized staff/member operation, preserve idempotency, and cannot be reassigned across customers, members, products, or sites.
- Secrets do not appear in public settings, API output, logs, exports, client bundles, error details, or cache keys. Configuration precedence and `_FILE` secret loading described in `docs/codebase/configuration.md` must not be influenced by HTTP input.
- Resource-intensive parsing, image work, archives, imports, exports, email sends, remote fetches, filters, and bulk actions enforce useful bounds and cleanup temporary state.

Ghost Core normally serves one publication per configured instance. Cross-publication tenant isolation in Ghost(Pro) infrastructure is not established by this repository and should be assessed in the hosting/orchestration code that creates and isolates instances. Likewise, a malicious host administrator, database administrator, or publication owner intentionally installing hostile client-side theme code already holds broad authority; the relevant application question is whether that authority unexpectedly crosses into the host, another identity, or a protected external network.

# Attack Surface, Mitigations, and Attacker Stories

## APIs, authentication, and authorization

`ghost/core/core/server/web/api/endpoints/admin/routes.js`, `content/routes.js`, and `web/members/app.js` expose the main API surfaces. High-value operations include staff/session management, posts and pages, member exports and subscriptions, themes, settings, integrations, webhooks, route files, database import/export, media, email, analytics tokens, and scheduled work.

Existing controls include the distinct authentication flows documented in `docs/codebase/authentication.md`; server-side session storage; HTTP-only, path-scoped, HTTPS-secure Admin cookies; Admin-session origin checks and sign-in verification; short-lived HS256 Admin JWTs with key type and audience validation; role permissions; integration endpoint/method allowlisting in `web/api/endpoints/admin/middleware.js`; and rate-limit/enumeration controls in `web/shared/middleware/brute.js`. API serialization guidance also favors writable-property allowlists (`docs/practices/api-design.md`).

Realistic attacker stories include credential replay, session fixation or origin confusion, JWT audience or key-type confusion, alternate-route authorization gaps, IDOR between members or staff resources, mass assignment, cache leakage, and brute-force or email-cost abuse. Content API key disclosure alone is not a vulnerability because those keys are intended for public clients; access to non-public content using only that key would be.

## Content, themes, rendering, and browser applications

The theme engine and Handlebars helpers under `ghost/core/core/frontend/`, Koenig's editor/converters/renderers, Admin, Portal, Comments UI, and other injected public apps process content across server HTML, email HTML, React DOM, and browser-script contexts. Stored XSS is particularly consequential when malicious content is viewed in Admin by a higher-privileged staff user or on many public pages.

Existing controls include Handlebars expression escaping, focused `sanitize-html` use, comment sanitization, URL/attribute escaping in helpers, HTML cleaning packages, model input sanitization, and theme validation through gscan. Uploaded theme archives have compressed and uncompressed size limits and fatal validation prevents activation (`services/themes/validate.js`). These controls are context-specific: a sanitizer suitable for a caption or comment does not automatically make a value safe in a URL, script, CSS, JSON, or React HTML sink.

Relevant stories include stored/reflected/DOM XSS, unsafe `SafeString` use, malicious embed/oEmbed metadata, prototype or parser abuse in serialized editor state, theme archive traversal or decompression bombs, and an Admin/public-app version mismatch that exposes a server operation the client assumed unavailable.

## Files, imports, exports, storage, and routing

The Admin API accepts images, media, arbitrary supported files, SVGs, themes, route YAML, member/post CSV, and database imports. It can produce database, content, member, and archive exports. Storage and redirect adapters, dynamic routes, static-file serving, image processing, backup paths, and custom redirects translate stored values into filesystem or response behavior.

`web/api/middleware/upload.js` provides type checks, SVG sanitization, theme upload limits, temporary-file cleanup, and specialized validation, while theme validation constrains archive expansion. Security-sensitive classes remain path traversal, archive extraction outside a temporary root, symlink handling, MIME/extension confusion, active-content upload, image parser abuse, CSV formula injection, unsafe YAML/JSON parsing, unbounded import/export work, unauthorized backup/export, and open redirects. An operator intentionally importing their own content is trusted for publication-level changes but not for arbitrary host-file access or server code execution.

## Outbound requests, integrations, and webhooks

Webhooks, webmentions, oEmbed, remote metadata, recommendations, theme installation, mail, analytics, and update checks cause server-side network traffic. Attacker influence varies: some URLs are supplied by anonymous protocols, some by members/content, and others only by authorized staff.

The default webhook sender uses `server/lib/request-external` unless the operator explicitly enables internal-IP webhook access; it also applies timeouts and signs payloads when a webhook secret is configured (`services/webhooks/webhook-trigger.js`). Stripe webhook handling rejects missing or invalid signatures before changing billing state (`services/stripe/webhook-controller.js`). Relevant stories include SSRF through direct URLs, redirects, DNS rebinding, alternative IP encodings, or parser disagreement; response-size and timeout denial of service; secret leakage through URL logging; spoofed or replayed inbound events; and webhook payload confusion. An authorized owner deliberately enabling internal-IP webhooks reduces the SSRF boundary by configuration and is not equivalent to an anonymous SSRF bypass, but unexpected access beyond that explicit setting remains important.

## Data, payments, email, jobs, and caches

Bookshelf models, Knex-backed persistence, migrations, caches, jobs, newsletter delivery, analytics, and Stripe synchronization hold high-volume personal and business data. Failure modes include SQL/filter injection, authorization bypass in bulk operations, cross-member data association, forged subscription state, duplicate/non-idempotent job execution, recipient-selection errors, formula injection in exports, secret or PII logging, private-response caching, and denial of service through expensive filters, sends, imports, exports, or analytics queries.

Existing structure separates current member/subscription records from event history and preserves send-time recipient records (`docs/codebase/database.md`). Stripe checkout validates configured products/prices against Stripe (`docs/codebase/stripe-flows.md`). Cache control is deliberately part of the API contract, and mutation responses can identify invalidation targets (`docs/practices/api-design.md`). These controls make ownership, idempotency, and cache-key correctness central review points.

## Secondary supply-chain surface

Package manifests, pnpm catalogs, Nx build tasks, release scripts, GitHub workflows, and npm/CDN publication can affect every deployment. Treat untrusted pull-request code, generated artifacts, dependency install hooks, and release credentials as meaningful only when the workflow actually runs them with elevated tokens or publishes their output. Developer-only demo servers and test fixtures are low priority unless reachable in production or invoked by privileged CI.

# Severity Calibration (Critical, High, Medium, Low)

## Critical

Use Critical for unauthenticated or low-privilege compromise of the Ghost host, all publication administration, or an equivalently catastrophic boundary with realistic deployment preconditions. Examples include remote code execution through a public upload/import/theme parser; authentication or authorization bypass that grants owner-level Admin access; SQL injection that provides full write/control over credentials and content; or default-configuration SSRF that reliably reaches cloud metadata or an internal control plane and obtains credentials enabling host or fleet compromise. A supply-chain flaw is Critical only when an untrusted actor can realistically publish trusted Ghost artifacts or execute in a privileged release context.

## High

Use High for major confidentiality or integrity loss that stops short of reliable whole-host/fleet takeover. Examples include stored XSS that executes in an owner/staff Admin context; cross-member or cross-role authorization bypass exposing bulk member, billing, recipient, or unpublished-content data; session/token forgery or theft with privileged API access; arbitrary file read/write within sensitive Ghost-controlled paths; Stripe webhook or entitlement forgery enabling broad billing manipulation; or SSRF reaching sensitive internal services without demonstrated credential-to-host takeover. Large-scale paid-content bypass can be High when it defeats the core business boundary across many resources; a single low-value content leak may be lower.

## Medium

Use Medium for bounded unauthorized changes, limited sensitive-data exposure, or meaningful abuse requiring stronger preconditions. Examples include CSRF or origin-check failure affecting a non-owner setting; IDOR exposing one member's non-financial private data; open redirect that materially strengthens a trusted-domain phishing or token flow; rate-limit bypass enabling substantial email/provider cost or account enumeration; stored XSS limited to anonymous/public context without staff reach; bounded SSRF to a non-sensitive service; or cache confusion leaking a narrow members-only response. Operator action, a non-default feature, or victim interaction may reduce severity but does not automatically make a reachable issue Low.

## Low

Use Low for minor leaks or integrity effects with little security consequence, strong preconditions, or no crossing of a meaningful production boundary. Examples include self-XSS, low-impact open redirects unrelated to credentials, verbose errors containing no secrets or personal data, small resource amplification that cannot threaten availability, missing hardening headers on a page with no sensitive context, or a weakness reachable only in a local development/demo server. Deliberate actions already within an owner's documented authority—such as adding custom client-side code to their own theme—or issues requiring a compromised host/database administrator are normally out of scope unless they create an unexpected escalation beyond that authority.

Repository: target_sha256_3d4800ba07f6575529623665adb38defc1a2aa7d60ae3c377c9c254a7583d21b
Version: codex-security-snapshot/v1:sha256:0ad4ec6b48b06c54eee17d70dfe220188b29fe5fd3c22e4e282718812c7e6615
