import {decoratePostSearchResult} from 'ghost-admin/components/koenig-lexical-editor';
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
});
