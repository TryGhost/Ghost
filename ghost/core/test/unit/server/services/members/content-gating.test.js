const assert = require('node:assert/strict');
const {getPostAccessFilter, checkPostAccess, checkSegmentPostAccess, checkGatedBlockAccess} = require('../../../../../core/server/services/members/content-gating');

describe('Members Service - Content gating', function () {
    describe('getPostAccessFilter', function () {
        it('returns status:-free for paid posts', function () {
            assert.equal(getPostAccessFilter({visibility: 'paid'}), 'status:-free');
        });

        it('returns a product OR filter for tiers posts', function () {
            const filter = getPostAccessFilter({visibility: 'tiers', tiers: [{slug: 'gold'}, {slug: 'silver'}]});
            assert.equal(filter, 'product:\'gold\',product:\'silver\'');
        });

        it('returns null for a tiers post with no tiers relation', function () {
            assert.equal(getPostAccessFilter({visibility: 'tiers'}), null);
        });

        it('returns null for a tiers post with an empty tiers list', function () {
            assert.equal(getPostAccessFilter({visibility: 'tiers', tiers: []}), null);
        });

        it('passes through other visibility values', function () {
            assert.equal(getPostAccessFilter({visibility: 'members'}), 'members');
            assert.equal(getPostAccessFilter({visibility: 'public'}), 'public');
        });

        it('agrees with checkPostAccess for tiers posts', function () {
            const post = {visibility: 'tiers', tiers: [{slug: 'gold'}]};
            const onTier = {id: 'a', status: 'paid', products: [{slug: 'gold'}]};
            const offTier = {id: 'b', status: 'paid', products: [{slug: 'silver'}]};
            assert.equal(checkPostAccess(post, onTier), true);
            assert.equal(checkPostAccess(post, offTier), false);
        });
    });

    describe('checkPostAccess', function () {
        let post;
        let member;
        let access;

        it('should allow access to public posts without member', async function () {
            post = {visibility: 'public'};
            member = null;
            access = checkPostAccess(post, member);
            assert.equal(access, true);
        });

        it('should allow access to public posts with member', async function () {
            post = {visibility: 'public'};
            member = {id: 'test'};
            access = checkPostAccess(post, member);
            assert.equal(access, true);
        });

        it('should allow access to members only post with member', async function () {
            post = {visibility: 'members'};
            member = {id: 'test'};
            access = checkPostAccess(post, member);
            assert.equal(access, true);
        });

        it('should allow access to paid members only posts for paid members', async function () {
            post = {visibility: 'paid'};
            member = {id: 'test', status: 'paid'};
            access = checkPostAccess(post, member);
            assert.equal(access, true);
        });

        it('should allow access to tiers only post for members on allowed tier', async function () {
            post = {visibility: 'tiers', tiers: [{slug: 'test-tier'}]};
            member = {id: 'test', status: 'paid', products: [{
                slug: 'test-tier'
            }]};
            access = checkPostAccess(post, member);
            assert.equal(access, true);
        });

        it('should not error out if the slug associated with a tier is only 1 character in length', async function () {
            post = {visibility: 'tiers', tiers: [{slug: 'x'}]};
            member = {id: 'test', status: 'paid', products: [{
                slug: 'x'
            }]};

            assert.doesNotThrow(() => checkPostAccess(post, member));
        });

        it('should block access to members only post without member', async function () {
            post = {visibility: 'members'};
            member = null;
            access = checkPostAccess(post, member);
            assert.equal(access, false);
        });

        it('should block access to paid members only post without member', async function () {
            post = {visibility: 'paid'};
            member = null;
            access = checkPostAccess(post, member);
            assert.equal(access, false);
        });

        it('should block access to paid members only posts for free members', async function () {
            post = {visibility: 'paid'};
            member = {id: 'test', status: 'free'};
            access = checkPostAccess(post, member);
            assert.equal(access, false);
        });

        it('should block access to specific tiers only post without tiers list', async function () {
            post = {visibility: 'tiers'};
            member = {id: 'test'};
            access = checkPostAccess(post, member);
            assert.equal(access, false);
        });

        it('should block access to tiers only post for members not on allowed tier', async function () {
            post = {visibility: 'tiers', tiers: [{slug: 'test-tier'}]};
            member = {id: 'test', status: 'paid', products: [{
                slug: 'test-tier-2'
            }]};
            access = checkPostAccess(post, member);
            assert.equal(access, false);
        });
    });

    describe('checkSegmentPostAccess', function () {
        const paidPost = {visibility: 'paid'};
        const tiersPost = {visibility: 'tiers', tiers: [{slug: 'gold'}, {slug: 'silver'}]};

        it('permits the paid segment on a paid post', function () {
            assert.equal(checkSegmentPostAccess(paidPost, 'status:-free'), true);
        });

        it('blocks the free segment on a paid post', function () {
            assert.equal(checkSegmentPostAccess(paidPost, 'status:free'), false);
        });

        it('permits a tier segment on a paid post', function () {
            assert.equal(checkSegmentPostAccess(paidPost, 'status:-free+product:\'gold\''), true);
        });

        it('blocks the plain paid segment on a tiers post', function () {
            // members without a matching tier are paid too — least privilege wins
            assert.equal(checkSegmentPostAccess(tiersPost, 'status:-free'), false);
        });

        it('permits a matching tier segment on a tiers post', function () {
            assert.equal(checkSegmentPostAccess(tiersPost, 'status:-free+product:\'silver\''), true);
        });

        it('blocks a non-matching tier segment on a tiers post', function () {
            assert.equal(checkSegmentPostAccess(tiersPost, 'status:-free+product:\'bronze\''), false);
        });

        it('permits the send pipeline access variant on a tiers post', function () {
            assert.equal(checkSegmentPostAccess(tiersPost, 'status:-free+(product:\'gold\',product:\'silver\')'), true);
        });

        it('blocks the send pipeline no-access variant on a tiers post', function () {
            assert.equal(checkSegmentPostAccess(tiersPost, 'status:-free+(product:-\'gold\'+product:-\'silver\')'), false);
        });

        it('permits a multi-tier segment when one named tier grants access', function () {
            const goldOnlyPost = {visibility: 'tiers', tiers: [{slug: 'gold'}]};
            assert.equal(checkSegmentPostAccess(goldOnlyPost, 'product:\'gold\'+product:\'silver\''), true);
        });

        it('blocks a mixed free/paid segment on a paid post', function () {
            assert.equal(checkSegmentPostAccess(paidPost, 'status:free,status:-free+product:\'gold\''), false);
        });

        it('blocks a negated tier segment on a paid post', function () {
            // matches free members too, so least privilege wins
            assert.equal(checkSegmentPostAccess(paidPost, 'product:-\'gold\''), false);
        });

        it('blocks an OR of tiers when one named tier lacks access', function () {
            const goldOnlyPost = {visibility: 'tiers', tiers: [{slug: 'gold'}]};
            assert.equal(checkSegmentPostAccess(goldOnlyPost, 'product:\'gold\',product:\'silver\''), false);
        });

        it('blocks any segment on a tiers post with no tiers configured', function () {
            const misconfiguredPost = {visibility: 'tiers', tiers: []};
            assert.equal(checkSegmentPostAccess(misconfiguredPost, 'status:-free+product:\'gold\''), false);
        });

        it('blocks segments with only unknown keys', function () {
            assert.equal(checkSegmentPostAccess(paidPost, 'label:vip'), false);
        });

        it('blocks malformed segments', function () {
            assert.equal(checkSegmentPostAccess(paidPost, 'status:(('), false);
        });
    });

    describe('checkGatedBlockAccess', function () {
        function testCheckGatedBlockAccess({params, member, expectedAccess}) {
            const access = checkGatedBlockAccess(params, member);
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
});
