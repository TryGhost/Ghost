# Runtime architecture

Ghost Core is one Node.js application which serves the public site, Admin, and
the APIs. It also runs the services and background work needed by those
interfaces. The browser applications in `apps/` are built separately and talk
to Ghost Core over HTTP.

This guide describes the main runtime boundaries. For a directory-by-directory
map, see the [monorepo structure guide](monorepo-structure.md).

## Request handling

Ghost starts with a small Express application in maintenance mode while it
loads configuration, connects to the database, and initializes its services.
Once boot is complete, it mounts the full Ghost application and disables
maintenance mode.

The full application has a shared parent and two main Express applications:

```text
Ghost server
└── parent application
    ├── backend application
    │   ├── /ghost/api/content/   Content API
    │   ├── /ghost/api/admin/     Admin API
    │   └── /ghost/               Admin application
    └── frontend application
        ├── /members/             Member routes
        ├── /webmentions/         Webmention routes
        ├── /gift/                Gift preview
        └── /                     Public site and theme routes
```

The backend and frontend can be mounted on different configured hostnames or
subdirectories. They are useful code boundaries, but they are not independent
services: they share one process, boot sequence, configuration, database, and
many server services. Dynamic routing also initializes during backend-only
boots because APIs, email, and webhooks use it to build public URLs.

The shared parent application adds request IDs, request logging, compression,
common response locals, and optional request queuing before requests reach the
backend or frontend application.

## APIs and server logic

The Content API and Admin API are mounted under `/ghost/api/`. Their HTTP
routes use the API framework pipeline to apply request validation,
authentication and permissions, execute an endpoint, and serialize its
response.

Endpoint code delegates domain and integration logic to the services under
`ghost/core/core/server/services/`. Models and data access remain under
`ghost/core/core/server/`. The codebase is evolving incrementally, so existing
services do not all use the same construction, dependency injection, or export
pattern. Follow the nearby service when extending an established area. For a
new standalone service, follow the [services guide](../../ghost/core/core/server/services/README.md).

Ghost's boot sequence owns service initialization. Services which listen for
events, schedule work, or hold resources must be initialized during the
appropriate boot phase rather than on their first request.

## Public site and themes

The frontend application serves public files and stored media, establishes the
member session, and then passes page requests through Ghost's dynamic routing
and active theme. Theme templates are rendered on the server with Handlebars.

Frontend helpers and routes use an internal proxy module to reach server APIs,
settings, URL generation, and other shared capabilities. This preserves a
boundary in the source tree, but it is an in-process boundary rather than an
HTTP request to the Content API.

`routes.yaml`, the active theme, and site settings affect how public URLs are
resolved and rendered. Routing can be reloaded while Ghost is running. The
bridge in `ghost/core/core/bridge.js` contains the remaining explicit
communication between server and frontend code, including theme and routing
updates.

## Browser applications

Admin is a browser application served at `/ghost/`. It currently combines the
React application in `apps/admin/` with routes that still fall back to the
legacy Ember application in `apps/ember-admin/`. Both use the Admin API. New
Admin features are built in React using `admin-x-framework` and Shade; see the
[Admin README](../../apps/admin/README.md) for the current boundary.

Portal, Comments, Search, Signup Form, Announcement Bar, and Admin Toolbar are
separate browser applications. Ghost adds their script configuration to public
pages through theme helpers, and the applications use Ghost's public HTTP
interfaces at runtime.

These applications do not all ship with Ghost Core. Admin can deploy before a
server release, and public apps can publish independently. Code spanning a
browser application and Ghost Core must not assume both sides change at the
same time. See the [shipping guide](../contributing/shipping.md) for the current
release paths.

## Where a feature crosses boundaries

A feature may involve several parts of the runtime:

- schema and data access in Ghost Core
- domain behavior in a server service
- Content or Admin API endpoints
- React Admin UI
- public theme rendering or a public browser app
- events, jobs, email, or webhooks triggered after a change

Keep the domain behavior in the server rather than duplicating it in an HTTP
route or browser application. Treat each HTTP and deployment boundary as a
compatibility boundary, and add tests at the closest layer to each behavior.
