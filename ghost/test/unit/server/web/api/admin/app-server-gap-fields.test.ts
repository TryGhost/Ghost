import assert from 'node:assert/strict';

import { SERVER_GAPS, scopeForField } from '@tryghost/app-contracts/bridge';
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

/** What Ghost includes for a request that names no `include`, as the Admin API reads it. */
function defaultsOf(serializer: Serializer): string[] {
  const frame = {
    apiType: 'admin',
    options: { context: { user: '1' } } as Record<string, unknown>,
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

// The bridge's field rules for posts and pages: one map of includes and sort fields to the scope
// each needs, and Ghost's defaults for each.
const { fieldScopes } = SERVER_GAPS.postFields;
const defaultIncludes = {
  posts: SERVER_GAPS.postFields.defaultIncludes,
  pages: SERVER_GAPS.pageFields.defaultIncludes,
};

/** The scope a field needs, as the bridge reads its map, or undefined when apps can't have it. */
const scopeOf = (field: string) => scopeForField(fieldScopes, field);

// Relations apps can't include at all.
const REFUSED = new Set(['authors.roles', 'post_revisions.author']);

// Ghost doesn't yet hold what reading a post returns to an app's scopes, so Admin's bridge holds
// how a post performed back for apps approved for `post:readStats`. It does that from what it
// knows of Ghost's includes, defaults and sorts, so a change to any of them must change the
// bridge too.
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

  it('holds pages to the same map as posts', function () {
    assert.equal(SERVER_GAPS.pageFields.fieldScopes, fieldScopes);
  });

  it('knows every relation Ghost lets posts and pages include', function () {
    for (const relation of new Set([...includesOf(posts), ...includesOf(pages)])) {
      assert.ok(
        scopeOf(relation) !== undefined || REFUSED.has(relation),
        `${relation} is neither mapped to a scope nor refused`,
      );
    }
  });

  it('needs post:readStats for every field Ghost sorts posts by how they performed', function () {
    const special = [
      ...String(models.Post.prototype.orderRawQuery).matchAll(/field === '([^']+)'/g),
    ].map((match) => match[1]!);
    assert.ok(special.length > 0, 'found no fields with their own sort');
    for (const field of special) {
      assert.equal(scopeOf(field), 'post:readStats', field);
    }
  });
});
