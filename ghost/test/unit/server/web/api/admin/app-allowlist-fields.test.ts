import assert from 'node:assert/strict';

import { ADMIN_API_ALLOWLIST, scopeForField } from '@tryghost/app-contracts/bridge';
import { serializers } from '@tryghost/api-framework';

// @ts-expect-error This module lacks type definitions.
import postsInput from '../../../../../../core/server/api/endpoints/utils/serializers/input/posts';
// @ts-expect-error This module lacks type definitions.
import pagesInput from '../../../../../../core/server/api/endpoints/utils/serializers/input/pages';
// @ts-expect-error This module lacks type definitions.
import posts from '../../../../../../core/server/api/endpoints/posts';
// @ts-expect-error This module lacks type definitions.
import pages from '../../../../../../core/server/api/endpoints/pages';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../../../core/server/models';

type Serializer = { browse(apiConfig: unknown, frame: unknown): void };
type Controller = Record<string, { validation?: { options?: { include?: { values: string[] } } } }>;

/**
 * What Ghost includes for a request that names no `include`, as the Admin API reads it, given the
 * request's other options as its query parser reads them.
 */
function defaultsOf(serializer: Serializer, query: Record<string, unknown> = {}): string[] {
  const frame = {
    apiType: 'admin',
    options: { context: { user: '1' }, ...query } as Record<string, unknown>,
  };
  serializers.input.all.all({}, frame as never);
  serializer.browse({}, frame);
  return (frame.options.withRelated as string[] | undefined) ?? [];
}

/** Every relation a controller's routes let a request include. */
const includesOf = (controller: Controller) => [
  ...new Set(
    Object.values(controller).flatMap(
      (method) => method.validation?.options?.include?.values ?? [],
    ),
  ),
];

// The posts and pages in the bridge's allowlist: one map of includes and sort fields to the scope
// each needs, and Ghost's defaults by resource.
const fieldScopes = ADMIN_API_ALLOWLIST.post.fieldScopes!;
const defaultIncludes = ADMIN_API_ALLOWLIST.post.defaultIncludes!;

/** The scope a field needs, as the bridge reads its map, or undefined when apps can't have it. */
const scopeOf = (field: string) => scopeForField(fieldScopes, field);

// Relations apps can't include at all.
const REFUSED = new Set(['authors.roles', 'post_revisions.author']);

// Apps reach posts and pages through Admin's bridge, which holds how a post performed back for
// apps approved for `post:read_stats`. It does that from what it knows of Ghost's includes,
// defaults and sorts, so a change to any of them must change the bridge too.
describe('the app bridge’s post and page fields', function () {
  for (const [resource, serializer] of [
    ['posts', postsInput],
    ['pages', pagesInput],
  ] as const) {
    it(`names Ghost's own default includes for ${resource}, less what apps can't have`, function () {
      assert.deepEqual(
        defaultsOf(serializer).filter((relation) => !REFUSED.has(relation)),
        defaultIncludes[resource],
      );
    });
  }

  // The bridge names the defaults only for a request that asks for no `fields`, as Ghost does.
  it('adds no defaults for a request that asks for some fields', function () {
    for (const serializer of [postsInput, pagesInput]) {
      for (const fields of ['id,title', ' ', ['', '']]) {
        const included = defaultsOf(serializer, { fields });
        assert.deepEqual(
          included.filter((relation) => scopeOf(relation) === 'post:read_stats'),
          [],
          JSON.stringify(fields),
        );
      }
      assert.notDeepEqual(
        defaultsOf(serializer, { fields: '' }).filter(
          (relation) => scopeOf(relation) === 'post:read_stats',
        ),
        [],
      );
    }
  });

  it('knows every relation Ghost lets posts and pages include', function () {
    for (const relation of new Set([...includesOf(posts), ...includesOf(pages)])) {
      assert.ok(
        scopeOf(relation) !== undefined || REFUSED.has(relation),
        `${relation} is neither mapped to a scope nor refused`,
      );
    }
  });

  it('needs post:read_stats for every field Ghost sorts posts by how they performed', function () {
    const special = [
      ...String(models.Post.prototype.orderRawQuery).matchAll(/field === '([^']+)'/g),
    ].map((match) => match[1]!);
    assert.ok(special.length > 0, 'found no fields with their own sort');
    for (const field of special) {
      assert.equal(scopeOf(field), 'post:read_stats', field);
    }
  });
});
