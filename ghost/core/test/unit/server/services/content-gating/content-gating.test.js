const assert = require('assert/strict');
const sinon = require('sinon');
const contentGatingService = require('../../../../../core/server/services/content-gating');
const accessChecks = require('../../../../../core/server/services/content-gating/access-checks');
const gatedBlocks = require('../../../../../core/server/services/content-gating/gated-blocks');

describe('Content gating service', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('checkPostAccess', function () {
        const checkPostAccess = contentGatingService.checkPostAccess;

        it('should allow access to public posts without member', async function () {
            const post = {visibility: 'public'};
            const member = null;
            assert.equal(checkPostAccess(post, member), true);
        });

        it('should allow access to public posts with member', async function () {
            const post = {visibility: 'public'};
            const member = {status: 'paid'};
            assert.equal(checkPostAccess(post, member), true);
        });

        it('should allow access to members only post with member', async function () {
            const post = {visibility: 'members'};
            const member = {status: 'paid'};
            assert.equal(checkPostAccess(post, member), true);
        });

        it('should allow access to paid members only posts for paid members', async function () {
            const post = {visibility: 'paid'};
            const member = {status: 'paid'};
            assert.equal(checkPostAccess(post, member), true);
        });

        it('should allow access to tiers only post for members on allowed tier', async function () {
            const post = {visibility: 'tiers', tiers: [{slug: 'test-tier'}]};
            const member = {status: 'paid', products: [{
                slug: 'test-tier'
            }]};
            assert.equal(checkPostAccess(post, member), true);
        });

        it('should not error out if the slug associated with a tier is only 1 character in length', async function () {
            const post = {visibility: 'tiers', tiers: [{slug: 'x'}]};
            const member = {status: 'paid', products: [{
                slug: 'x'
            }]};

            assert.doesNotThrow(() => checkPostAccess(post, member));
        });

        it('should block access to members only post without member', async function () {
            const post = {visibility: 'members'};
            const member = null;
            assert.equal(checkPostAccess(post, member), false);
        });

        it('should block access to paid members only post without member', async function () {
            const post = {visibility: 'paid'};
            const member = null;
            assert.equal(checkPostAccess(post, member), false);
        });

        it('should block access to paid members only posts for free members', async function () {
            const post = {visibility: 'paid'};
            const member = {status: 'free'};
            assert.equal(checkPostAccess(post, member), false);
        });

        it('should block access to specific tiers only post without tiers list', async function () {
            const post = {visibility: 'tiers'};
            const member = {status: 'paid'};
            assert.equal(checkPostAccess(post, member), false);
        });

        it('should block access to tiers only post for members not on allowed tier', async function () {
            const post = {visibility: 'tiers', tiers: [{slug: 'test-tier'}]};
            const member = {status: 'paid', products: [{
                slug: 'test-tier-2'
            }]};
            assert.equal(checkPostAccess(post, member), false);
        });
    });

    describe('checkGatedBlockAccess', function () {
        function testCheckGatedBlockAccess({params, member, expectedAccess}) {
            const access = contentGatingService.checkGatedBlockAccess(params, member);
            assert.equal(access, expectedAccess);
        }

        it('nonMember:true permits access when not logged in', function () {
            testCheckGatedBlockAccess({params: {nonMember: true}, member: null, expectedAccess: true});
        });

        it('nonMember:false blocks access when not logged in', function () {
            testCheckGatedBlockAccess({params: {nonMember: false}, member: null, expectedAccess: false});
        });

        it('memberSegment:"" blocks access when logged in', function () {
            testCheckGatedBlockAccess({params: {memberSegment: ''}, member: {}, expectedAccess: false});
        });

        it('memberSegment:undefined blocks access when logged in', function () {
            testCheckGatedBlockAccess({params: {memberSegment: undefined}, member: {}, expectedAccess: false});
        });

        it('memberSegment:"status:free" permits access when logged in as free member', function () {
            testCheckGatedBlockAccess({params: {memberSegment: 'status:free'}, member: {status: 'free'}, expectedAccess: true});
        });

        it('memberSegment:"status:free" blocks access when logged in as paid member', function () {
            testCheckGatedBlockAccess({params: {memberSegment: 'status:free'}, member: {status: 'paid'}, expectedAccess: false});
        });

        it('handles unknown segment keys', function () {
            testCheckGatedBlockAccess({params: {memberSegment: 'unknown:free'}, member: {status: 'free'}, expectedAccess: false});
        });
    });

    describe('removeGatedBlocksFromHtml', function () {
        it('calls gatedBlocks.removeGatedBlocksFromHtml with correct arguments', function () {
            const removeGatedBlocksFromHtmlStub = sinon.stub(gatedBlocks, 'removeGatedBlocksFromHtml');
            const html = '<p>test</p>';
            const member = {status: 'paid'};
            contentGatingService.removeGatedBlocksFromHtml(html, member);
            sinon.assert.calledWith(removeGatedBlocksFromHtmlStub, html, member, accessChecks.checkGatedBlockAccess);
        });
    });
});
