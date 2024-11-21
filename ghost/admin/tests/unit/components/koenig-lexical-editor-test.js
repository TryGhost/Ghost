import sinon from 'sinon';
import {decoratePostSearchResult, offerUrls} from 'ghost-admin/components/koenig-lexical-editor';
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
});
