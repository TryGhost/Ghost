import { describe, expect, it } from 'vitest';
import defaultRoutes from '../../../../../ghost/core/core/server/services/route-settings/default-routes.yaml?raw';
import { inspectCanvasRouting } from './route-compatibility';

describe('canvas renderer routing coverage', () => {
  it('accepts Core default routing and equivalent formatting/template normalization', () => {
    for (const source of [
      defaultRoutes,
      `# reordered, explicit empty routes\ntaxonomies: {author: '/author/{slug}/', tag: '/tag/{slug}/'}\nroutes: {}\ncollections: {'/': {template: [index], permalink: '/{slug}/'}}`,
      defaultRoutes.replace('    template: index\n', ''),
    ]) {
      expect(inspectCanvasRouting(source)).toEqual({
        supported: true,
        profile: 'ghost-default-v1',
        home: '/',
        postPermalink: '/{slug}/',
      });
    }
  });

  it.each([
    ['custom homepage', defaultRoutes.replace('routes:', 'routes:\n  /: home'), 'routes'],
    [
      'custom permalink',
      defaultRoutes.replace('/{slug}/', '/news/{slug}/'),
      'collections./.permalink',
    ],
    ['moved collection', defaultRoutes.replace('  /:', '  /news/:'), 'collections'],
    [
      'collection filter',
      defaultRoutes.replace('    template: index', '    template: index\n    filter: tag:news'),
      'collections./.filter',
    ],
    [
      'collection order',
      defaultRoutes.replace('    template: index', '    order: published_at asc'),
      'collections./.order',
    ],
    [
      'custom template',
      defaultRoutes.replace('template: index', 'template: news'),
      'collections./.template',
    ],
    [
      'multiple fallbacks',
      defaultRoutes.replace('template: index', 'template: [news, index]'),
      'collections./.template',
    ],
    ['custom taxonomy', defaultRoutes.replace('/tag/{slug}/', '/topic/{slug}/'), 'taxonomies.tag'],
    ['missing taxonomy', defaultRoutes.replace('  author: /author/{slug}/\n', ''), 'taxonomies'],
    ['empty configuration', '{}', 'collections'],
    ['unknown extension', `${defaultRoutes}\nredirects: {}`, 'redirects'],
  ])('refuses %s rather than assuming an HTTP 200 proves route support', (_label, source, path) => {
    expect(inspectCanvasRouting(source)).toMatchObject({
      supported: false,
      code: 'routing_unsupported',
      path,
    });
  });

  it.each([null, undefined, '', { collections: {} }])(
    'does not infer missing configuration: %s',
    (source) => {
      expect(inspectCanvasRouting(source)).toMatchObject({
        supported: false,
        code: 'routing_unavailable',
      });
    },
  );

  it.each([
    'collections: [',
    `${defaultRoutes}\ncollections: {}`,
    '---\ncollections: {}\n---\ncollections: {}',
    '!!js/function function() {return true}',
    'x'.repeat(262_145),
  ])('rejects malformed, duplicate, multiple-document, tagged or oversized YAML', (source) => {
    expect(inspectCanvasRouting(source)).toMatchObject({
      supported: false,
      code: 'routing_invalid',
    });
  });
});
