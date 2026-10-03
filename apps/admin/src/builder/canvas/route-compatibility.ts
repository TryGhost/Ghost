import { JSON_SCHEMA, load } from 'js-yaml';

export { default as DEFAULT_CANVAS_ROUTING_SOURCE } from '../../../../../ghost/core/core/server/services/route-settings/default-routes.yaml?raw';

export type RouteCompatibility =
  | { supported: true; profile: 'ghost-default-v1'; home: '/'; postPermalink: '/{slug}/' }
  | {
      supported: false;
      code: 'routing_unavailable' | 'routing_invalid' | 'routing_unsupported';
      message: string;
      path?: string;
    };

const MAX_ROUTING_BYTES = 262_144;
const unsupportedMessage =
  'Builder does not support this site’s custom routing yet. Open the site preview or return to Design settings.';

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function unsupported(path: string): RouteCompatibility {
  return { supported: false, code: 'routing_unsupported', message: unsupportedMessage, path };
}

/** A conservative capability check for the renderer's default-route resolver.
 * HTTP success, theme names and scraped HTML cannot establish routing support. */
export function inspectCanvasRouting(source: unknown): RouteCompatibility {
  if (typeof source !== 'string' || !source.trim()) {
    return {
      supported: false,
      code: 'routing_unavailable',
      message:
        'Builder could not verify this site’s routing. Open the site preview or return to Design settings.',
    };
  }
  let configuration: unknown;
  try {
    if (new TextEncoder().encode(source).byteLength > MAX_ROUTING_BYTES) {
      throw new Error('Routing configuration exceeds the parser limit.');
    }
    configuration = load(source, { schema: JSON_SCHEMA });
  } catch {
    return {
      supported: false,
      code: 'routing_invalid',
      message:
        'Builder could not read this site’s routes configuration. Open the site preview or return to Design settings.',
    };
  }
  if (!record(configuration)) {
    return unsupported('collections');
  }
  const extension = Object.keys(configuration).find(
    (key) => !['routes', 'collections', 'taxonomies'].includes(key),
  );
  if (extension) {
    return unsupported(extension.slice(0, 128));
  }
  const routes = configuration.routes;
  if (
    routes !== null &&
    routes !== undefined &&
    (!record(routes) || Object.keys(routes).length > 0)
  ) {
    return unsupported('routes');
  }
  const collections = configuration.collections;
  if (
    !record(collections) ||
    Object.keys(collections).length !== 1 ||
    !Object.hasOwn(collections, '/')
  ) {
    return unsupported('collections');
  }
  const home = collections['/'];
  if (!record(home)) {
    return unsupported('collections./');
  }
  const option = Object.keys(home).find((key) => !['permalink', 'template'].includes(key));
  if (option) {
    return unsupported(`collections./.${option.slice(0, 128)}`);
  }
  if (home.permalink !== '/{slug}/') {
    return unsupported('collections./.permalink');
  }
  if (
    home.template !== null &&
    home.template !== undefined &&
    home.template !== 'index' &&
    !(
      Array.isArray(home.template) &&
      (home.template.length === 0 || (home.template.length === 1 && home.template[0] === 'index'))
    )
  ) {
    return unsupported('collections./.template');
  }
  const taxonomies = configuration.taxonomies;
  if (
    !record(taxonomies) ||
    Object.keys(taxonomies).length !== 2 ||
    !Object.hasOwn(taxonomies, 'tag') ||
    !Object.hasOwn(taxonomies, 'author')
  ) {
    return unsupported('taxonomies');
  }
  if (taxonomies.tag !== '/tag/{slug}/') {
    return unsupported('taxonomies.tag');
  }
  if (taxonomies.author !== '/author/{slug}/') {
    return unsupported('taxonomies.author');
  }
  return { supported: true, profile: 'ghost-default-v1', home: '/', postPermalink: '/{slug}/' };
}
