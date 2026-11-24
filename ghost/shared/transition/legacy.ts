/**
 * Definitions for legacy modules that are one instance for the whole process.
 *
 * A service in the new shape names what it needs. These let it name a legacy
 * module without importing it. Each `create` returns the existing module, so
 * old and new code share one instance.
 *
 * `site` here records what the module is, not what it does today: it holds one
 * site's state, and Ghost runs one site per process, so there is one of it.
 */
import { defineService } from '#support/define-service';
import type { GhostLogger } from '@tryghost/logging';
import type { EventEmitter } from 'node:events';

export const Logging = defineService({
  name: 'logging',
  lifetime: 'process',
  create: (): GhostLogger => require('@tryghost/logging'),
});

/** Bookshelf model events and other string-named events. */
export const LegacyEvents = defineService({
  name: 'legacy-events',
  lifetime: 'site',
  create: (): EventEmitter => require('../../core/server/lib/common/events'),
});

export const SettingsCache = defineService({
  name: 'settings-cache',
  lifetime: 'site',
  create: (): typeof import('../../core/shared/settings-cache') =>
    require('../../core/shared/settings-cache'),
});

export const UrlUtils = defineService({
  name: 'url-utils',
  lifetime: 'site',
  create: (): typeof import('../../core/shared/url-utils').default =>
    require('../../core/shared/url-utils').default,
});

export const UrlService = defineService({
  name: 'url-service',
  lifetime: 'site',
  create: () => require('../../core/server/services/url'),
});

export const BlogIcon = defineService({
  name: 'blog-icon',
  lifetime: 'site',
  create: () => require('../../core/server/lib/image').blogIcon,
});

/** Reads the site's URL from config to block requests to the site itself, so it is per site. */
export const ExternalRequest = defineService({
  name: 'external-request',
  lifetime: 'site',
  create: () => require('../../core/server/lib/request-external'),
});

/** The loaded config. One site's values today, so it is per site. */
export const Config = defineService({
  name: 'config',
  lifetime: 'site',
  create: () => require('../../core/shared/config'),
});

/** Bookshelf models. Each is bound to one database connection when its file loads, so they are per site. */
export const Models = defineService({
  name: 'models',
  lifetime: 'site',
  create: () => require('../../core/server/models'),
});
