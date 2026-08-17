import assert from 'node:assert/strict';
import sinon from 'sinon';

// require throughout, not import: the CJS-required posts-public controller
// reaches the gift-links singleton through its own require chain, which is a
// separate module instance from an ESM import's — stubs must target the
// instance the code under test actually uses.
const giftLinksService = require('../../../../../core/server/services/gift-links');
const {generateGiftKeyData, applyGiftAccess} = require('../../../../../core/server/api/endpoints/utils/gift-link-access');
const {Product} = require('../../../../../core/server/models/product');
const postsPublicController = require('../../../../../core/server/api/endpoints/posts-public');
const pagesPublicController = require('../../../../../core/server/api/endpoints/pages-public');

function frameWithGift(giftToken?: string) {
    return {original: {context: {giftToken, member: undefined as unknown}}};
}

describe('Gift link access', function () {
    let getPostByTokenStub: sinon.SinonStub;

    beforeEach(function () {
        // The service singleton is normally wired at boot; the stub replaces
        // its only query so no DB is touched.
        giftLinksService.init();
        getPostByTokenStub = sinon.stub(giftLinksService.service!, 'getPostByToken');

        sinon.stub(Product, 'findAll').resolves([{
            get: sinon.stub().returns('silver')
        }]);
    });

    afterEach(function () {
        sinon.restore();
    });

    // The response cache is disabled in test environments, so these key
    // contracts have no e2e coverage — this is their only line of defence.
    // Pages has no response cache yet, but its key must stay paired with the
    // applyGiftAccess call in its read so a future cache can't poison the
    // anonymous key with unlocked content.
    for (const [docName, controller] of [['posts', postsPublicController], ['pages', pagesPublicController]] as const) {
        describe(`${docName}-public read cache key`, function () {
            function readKey(giftToken?: string) {
                return controller.read.generateCacheKeyData({
                    options: {},
                    original: {context: {giftToken}},
                    data: {slug: 'an-entry'}
                });
            }

            it('serializes identically to a plain read without a gift token', async function () {
                assert.doesNotMatch(JSON.stringify(await readKey(undefined)), /gift/);
            });

            it('keys an unresolvable token differently from no token, so a gated 200 can never be served for a 403', async function () {
                getPostByTokenStub.resolves(null);

                const withoutGift = await readKey(undefined);
                const invalidGift = await readKey('revoked');

                assert.notEqual(JSON.stringify(withoutGift), JSON.stringify(invalidGift));
            });

            it('keys on the resolved post id, not the token, so a reset link reuses the unlocked variant', async function () {
                getPostByTokenStub.withArgs('old-token').resolves({id: 'post-1'});
                getPostByTokenStub.withArgs('new-token').resolves({id: 'post-1'});

                const oldKey = await readKey('old-token');
                const newKey = await readKey('new-token');

                assert.equal(JSON.stringify(oldKey), JSON.stringify(newKey));
            });
        });
    }

    describe('applyGiftAccess', function () {
        it('reuses the resolution stashed by the cache key pass — one lookup per request', async function () {
            getPostByTokenStub.withArgs('a-token').resolves({id: 'post-1'});
            const frame = frameWithGift('a-token');

            await generateGiftKeyData(frame);
            await applyGiftAccess(frame, {id: 'post-1'});

            assert.equal((frame.original.context.member as {status: string}).status, 'paid');
            sinon.assert.calledOnce(getPostByTokenStub);
        });

        it('refuses to run without the cache-key resolution, so verification can never ship uncoupled from the key', async function () {
            // A silent fallback here is exactly the miswiring no test env can
            // catch: an endpoint with verification but no gift cache key works
            // everywhere except behind a production response cache.
            getPostByTokenStub.withArgs('a-token').resolves({id: 'post-1'});
            const frame = frameWithGift('a-token');

            await assert.rejects(applyGiftAccess(frame, {id: 'post-1'}), (err: {errorType?: string}) => {
                assert.equal(err.errorType, 'IncorrectUsageError');
                return true;
            });
            assert.equal(frame.original.context.member, undefined);
        });

        it('403s with INVALID_GIFT_TOKEN when the token belongs to a different post', async function () {
            getPostByTokenStub.withArgs('a-token').resolves({id: 'post-2'});
            const frame = frameWithGift('a-token');

            await generateGiftKeyData(frame);
            await assert.rejects(applyGiftAccess(frame, {id: 'post-1'}), (err: {statusCode?: number; code?: string}) => {
                assert.equal(err.statusCode, 403);
                assert.equal(err.code, 'INVALID_GIFT_TOKEN');
                return true;
            });
            assert.equal(frame.original.context.member, undefined);
        });
    });
});
