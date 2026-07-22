import EmberObject from '@ember/object';
import sinon from 'sinon';
import {decoratePostSearchResult, getCardVisibilitySettings, getPostAccessConfig, offerUrls} from 'ghost-admin/components/koenig-lexical-editor';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit: Component: koenig-lexical-editor', function () {
    describe('decoratePostSearchResult()', function () {
        let result;

        beforeEach(function () {
            result = {
                title: 'Test Post',
                url: '/test-post',
                visibility: 'public',
                publishedAt: '2024-05-08T16:21:07.000Z'
            };
        });

        it('handles members disabled', function () {
            decoratePostSearchResult(result, {membersEnabled: false, timezone: 'Etc/UTC'});

            expect(result.metaText).to.equal('8 May 2024');
            expect(result.MetaIcon).to.be.undefined;
            expect(result.metaIconTitle).to.be.undefined;
        });

        it('handles public content', function () {
            decoratePostSearchResult(result, {membersEnabled: true, timezone: 'Etc/UTC'});

            expect(result.metaText).to.equal('8 May 2024');
            expect(result.MetaIcon).to.be.undefined;
            expect(result.metaIconTitle).to.be.undefined;
        });

        it('handles members content', function () {
            result.visibility = 'members';
            decoratePostSearchResult(result, {membersEnabled: true, timezone: 'Etc/UTC'});

            expect(result.metaText).to.equal('8 May 2024');
            expect(result.MetaIcon).to.exist;
            expect(result.metaIconTitle).to.equal('Members only');
        });

        it('handles paid members content', function () {
            result.visibility = 'paid';
            decoratePostSearchResult(result, {membersEnabled: true, timezone: 'Etc/UTC'});

            expect(result.metaText).to.equal('8 May 2024');
            expect(result.MetaIcon).to.exist;
            expect(result.metaIconTitle).to.equal('Paid-members only');
        });

        it('handles specific tiers content', function () {
            result.visibility = 'tiers';
            decoratePostSearchResult(result, {membersEnabled: true, timezone: 'Etc/UTC'});

            expect(result.metaText).to.equal('8 May 2024');
            expect(result.MetaIcon).to.exist;
            expect(result.metaIconTitle).to.equal('Specific tiers only');
        });

        it('handles unknown visibility', function () {
            result.visibility = 'unknown';
            decoratePostSearchResult(result, {membersEnabled: true, timezone: 'Etc/UTC'});

            expect(result.metaText).to.equal('8 May 2024');
            expect(result.MetaIcon).to.be.undefined;
            expect(result.metaIconTitle).to.be.undefined;
        });
    });

    describe('offersUrls', function () {
        let context;
        let performStub;

        beforeEach(function () {
            context = {
                fetchOffersTask: {
                    perform: () => {}
                },
                config: {
                    getSiteUrl: code => `https://example.com?offer=${code}`
                }
            };

            performStub = sinon.stub(context.fetchOffersTask, 'perform');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('returns an empty array if fetching offers gives no result', async function () {
            performStub.resolves([]);

            const results = await offerUrls.call(context);

            expect(performStub.callCount).to.equal(1);
            expect(results).to.deep.equal([]);
        });

        it('returns an empty array if fetching offers fails', async function () {
            performStub.rejects(new Error('Failed to fetch offers'));

            const results = await offerUrls.call(context);

            expect(performStub.callCount).to.equal(1);
            expect(results).to.deep.equal([]);
        });

        it(('returns an array of offers urls if fetching offers is successful'), async function () {
            performStub.resolves([
                {name: 'Yellow Thursday', code: 'yellow-thursday'},
                {name: 'Green Friday', code: 'green-friday'}
            ]);

            const results = await offerUrls.call(context);

            expect(performStub.callCount).to.equal(1);
            expect(results).to.deep.equal([
                {label: 'Offer — Yellow Thursday', value: 'https://example.com?offer=yellow-thursday'},
                {label: 'Offer — Green Friday', value: 'https://example.com?offer=green-friday'}
            ]);
        });
    });

    describe('getCardVisibilitySettings()', function () {
        it('shows web and email toggles when no post context is provided', function () {
            const settings = getCardVisibilitySettings();

            expect(settings).to.equal('web and email');
        });

        it('returns web and email for posts', function () {
            const settings = getCardVisibilitySettings({
                post: {
                    displayName: 'post'
                }
            });

            expect(settings).to.equal('web and email');
        });

        it('returns web only for pages', function () {
            const settings = getCardVisibilitySettings({
                post: {
                    displayName: 'page'
                }
            });

            expect(settings).to.equal('web only');
        });
    });

    describe('getPostAccessConfig()', function () {
        it('keeps subscribers updated when post access changes', function () {
            const post = EmberObject.create({visibility: 'members'});
            const notify = sinon.spy();
            const config = getPostAccessConfig({post});
            const unsubscribe = config.subscribe(notify);

            expect(config.getValue()).to.equal('members');

            post.set('visibility', 'paid');

            expect(config.getValue()).to.equal('paid');
            expect(notify.calledOnce).to.be.true;

            post.set('tiers', [{id: 'gold', name: 'Gold', slug: 'gold'}]);

            expect(config.getSelectedTiers()).to.deep.equal([{id: 'gold', name: 'Gold', slug: 'gold'}]);
            expect(notify.calledTwice).to.be.true;

            unsubscribe();
            post.set('visibility', 'public');

            expect(notify.calledTwice).to.be.true;
        });

        it('updates post access and clears tiers without an external handler', function () {
            const post = EmberObject.create({tiers: [{slug: 'gold'}], visibility: 'tiers'});
            const config = getPostAccessConfig({post});

            config.onChange('paid');

            expect(post.visibility).to.equal('paid');
            expect(post.tiers).to.deep.equal([]);
        });

        it('delegates updates when an external handler is provided', function () {
            const post = EmberObject.create({visibility: 'members'});
            const fetchTiers = sinon.stub().resolves([{id: 'gold', name: 'Gold', slug: 'gold'}]);
            const updatePostAccess = sinon.spy();
            const updatePostTiers = sinon.spy();
            const config = getPostAccessConfig({fetchTiers, post, updatePostAccess, updatePostTiers});

            config.onChange('public');
            config.onTiersChange([{id: 'gold', name: 'Gold', slug: 'gold'}]);

            expect(updatePostAccess.calledOnceWithExactly('public')).to.be.true;
            expect(updatePostTiers.calledOnceWithExactly([{id: 'gold', name: 'Gold', slug: 'gold'}])).to.be.true;
            expect(config.fetchTiers).to.equal(fetchTiers);
        });
    });
});
