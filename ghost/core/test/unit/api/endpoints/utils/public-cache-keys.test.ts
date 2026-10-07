import assert from 'node:assert/strict';

// Use the CJS instances reached by the endpoint controllers and serializers.
const { pipeline } = require('@tryghost/api-framework');
const MemoryCache = require('../../../../../core/server/adapters/cache/MemoryCache');
const gating = require('../../../../../core/server/api/endpoints/utils/serializers/output/utils/post-gating');
const postsController = require('../../../../../core/server/api/endpoints/posts-public');
const pagesController = require('../../../../../core/server/api/endpoints/pages-public');

interface Member {
  uuid?: string;
  status: string;
  products: Array<{ slug: string }>;
}

interface Post {
  visibility: string;
  tiers: Array<{ slug: string }>;
  html: string;
  access?: boolean;
}

interface Frame {
  options: { context: { member?: Member } };
  original: { context: { member?: Member } };
  response?: Record<string, Post[]>;
}

const embed = '<iframe src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"></iframe>';

describe('Public post response cache member isolation', function () {
  // Pages does not cache responses today, but its read key shares the helper
  // and must stay safe if a response cache is attached later.
  for (const [docName, method, endpoint] of [
    ['posts', 'browse', postsController.browse],
    ['posts', 'read', postsController.read],
    ['pages', 'read', pagesController.read],
  ] as const) {
    describe(`${docName} ${method}`, function () {
      function cachedRequest(visibility = 'paid', initialCache?: InstanceType<typeof MemoryCache>) {
        let queryCalls = 0;
        const controller = {
          docName,
          [method]: {
            ...endpoint,
            cache: initialCache || new MemoryCache(),
            // Isolate the real cache and output gating from database access.
            validation() {},
            permissions: false,
            query() {
              queryCalls += 1;
              return { visibility, tiers: [{ slug: 'silver' }], html: embed };
            },
          },
        };
        const api = pipeline(
          controller,
          {
            serializers: {
              input: {},
              output: {
                [docName]: {
                  all(post: Post, _config: unknown, frame: Frame) {
                    frame.response = { [docName]: [gating.forPost(post, frame)] };
                  },
                },
              },
            },
          },
          'content',
        );

        return {
          async request(member?: Member): Promise<Post> {
            const response = await api[method]({ slug: 'cached-post', context: { member } });
            return response[docName][0];
          },
          queryCalls: () => queryCalls,
        };
      }

      it('keeps personalized embeds separate for equally entitled members and UUID-less shims', async function () {
        const { request, queryCalls } = cachedRequest();
        const entitlement = { status: 'paid', products: [{ slug: 'silver' }] };
        const first = { ...entitlement, uuid: 'member-uuid-a' };
        const second = { ...entitlement, uuid: 'member-uuid-b' };

        assert.equal((await request(first)).html, embed.replace('%7Buuid%7D', first.uuid));
        assert.equal((await request(second)).html, embed.replace('%7Buuid%7D', second.uuid));
        assert.equal((await request(entitlement)).html, embed);
        assert.equal((await request()).html, '');

        assert.equal((await request(first)).html, embed.replace('%7Buuid%7D', first.uuid));
        assert.equal(
          queryCalls(),
          4,
          'The repeated first member request should use its cached response',
        );
      });

      it('rechecks access when the same member loses paid status', async function () {
        const { request, queryCalls } = cachedRequest();
        const member = { uuid: 'member-uuid', products: [{ slug: 'silver' }] };

        assert.equal((await request({ ...member, status: 'paid' })).access, true);
        const freeResponse = await request({ ...member, status: 'free' });
        assert.equal(freeResponse.access, false);
        assert.equal(freeResponse.html, '');
        assert.equal(queryCalls(), 2);
      });

      it('rechecks tier access when the same member changes products', async function () {
        const { request, queryCalls } = cachedRequest('tiers');
        const member = { uuid: 'member-uuid', status: 'paid' };

        assert.equal((await request({ ...member, products: [{ slug: 'silver' }] })).access, true);
        const otherTier = await request({ ...member, products: [{ slug: 'gold' }] });
        assert.equal(otherTier.access, false);
        assert.equal(otherTier.html, '');
        assert.equal(queryCalls(), 2);
      });

      it('does not let UUID-less shims reuse personalized entries written before member isolation', async function () {
        const member = { status: 'paid', products: [{ slug: 'silver' }] };
        const keyData = await endpoint.generateCacheKeyData({
          options: { context: { member } },
          original: { context: { member } },
          data: { slug: 'cached-post' },
        });
        // A persistent cache can still hold old entitlement-only entries on deploy.
        keyData.auth = { free: false, tiers: ['silver'] };
        const legacyKey = JSON.stringify(keyData, (_key, value) => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.fromEntries(
              Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
            );
          }
          return value;
        });
        const cache = new MemoryCache();
        cache.set(legacyKey, {
          [docName]: [
            { visibility: 'paid', html: embed.replace('%7Buuid%7D', 'other-member-uuid') },
          ],
        });

        const { request, queryCalls } = cachedRequest('paid', cache);
        assert.equal((await request(member)).html, embed);
        assert.equal(queryCalls(), 1);
      });
    });
  }
});
