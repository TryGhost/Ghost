const should = require('should');
const {checkPostAccess, checkGatedBlockAccess} = require('../../../../../core/server/services/members/content-gating');

describe('Members Service - Content gating', function () {
    describe('checkPostAccess', function () {
        let post;
        let member;
        let access;

        it('should allow access to public posts without member', async function () {
            post = {visibility: 'public'};
            member = null;
            access = checkPostAccess(post, member);
            should(access).be.true();
        });

        it('should allow access to public posts with member', async function () {
            post = {visibility: 'public'};
            member = {id: 'test'};
            access = checkPostAccess(post, member);
            should(access).be.true();
        });

        it('should allow access to members only post with member', async function () {
            post = {visibility: 'members'};
            member = {id: 'test'};
            access = checkPostAccess(post, member);
            should(access).be.true();
        });

        it('should allow access to paid members only posts for paid members', async function () {
            post = {visibility: 'paid'};
            member = {id: 'test', status: 'paid'};
            access = checkPostAccess(post, member);
            should(access).be.true();
        });

        it('should allow access to tiers only post for members on allowed tier', async function () {
            post = {visibility: 'tiers', tiers: [{slug: 'test-tier'}]};
            member = {id: 'test', status: 'paid', products: [{
                slug: 'test-tier'
            }]};
            access = checkPostAccess(post, member);
            should(access).be.true();
        });

        it('should not error out if the slug associated with a tier is only 1 character in length', async function () {
            post = {visibility: 'tiers', tiers: [{slug: 'x'}]};
            member = {id: 'test', status: 'paid', products: [{
                slug: 'x'
            }]};

            (() => checkPostAccess(post, member)).should.not.throw();
        });

        it('should block access to members only post without member', async function () {
            post = {visibility: 'members'};
            member = null;
            access = checkPostAccess(post, member);
            should(access).be.false();
        });

        it('should block access to paid members only post without member', async function () {
            post = {visibility: 'paid'};
            member = null;
            access = checkPostAccess(post, member);
            should(access).be.false();
        });

        it('should block access to paid members only posts for free members', async function () {
            post = {visibility: 'paid'};
            member = {id: 'test', status: 'free'};
            access = checkPostAccess(post, member);
            should(access).be.false();
        });

        it('should block access to specific tiers only post without tiers list', async function () {
            post = {visibility: 'tiers'};
            member = {id: 'test'};
            access = checkPostAccess(post, member);
            should(access).be.false();
        });

        it('should block access to tiers only post for members not on allowed tier', async function () {
            post = {visibility: 'tiers', tiers: [{slug: 'test-tier'}]};
            member = {id: 'test', status: 'paid', products: [{
                slug: 'test-tier-2'
            }]};
            access = checkPostAccess(post, member);
            should(access).be.false();
        });
    });

    describe('checkGatedBlockAccess', function () {
        function testCheckGatedBlockAccess({params, member, expectedAccess}) {
            const access = checkGatedBlockAccess(params, member);
            should(access).be.exactly(expectedAccess);
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
