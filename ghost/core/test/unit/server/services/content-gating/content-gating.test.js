const should = require('should');
const {checkPostAccess, checkGatedBlockAccess} = require('../../../../../core/server/services/content-gating');

describe('Content gating service', function () {
    describe('checkPostAccess', function () {
        it('should allow access to public posts without member', async function () {
            const post = {visibility: 'public'};
            const member = null;
            checkPostAccess(post, member).should.be.true();
        });

        it('should allow access to public posts with member', async function () {
            const post = {visibility: 'public'};
            const member = {id: 'test'};
            checkPostAccess(post, member).should.be.true();
        });

        it('should allow access to members only post with member', async function () {
            const post = {visibility: 'members'};
            const member = {id: 'test'};
            checkPostAccess(post, member).should.be.true();
        });

        it('should allow access to paid members only posts for paid members', async function () {
            const post = {visibility: 'paid'};
            const member = {id: 'test', status: 'paid'};
            checkPostAccess(post, member).should.be.true();
        });

        it('should allow access to tiers only post for members on allowed tier', async function () {
            const post = {visibility: 'tiers', tiers: [{slug: 'test-tier'}]};
            const member = {id: 'test', status: 'paid', products: [{
                slug: 'test-tier'
            }]};
            checkPostAccess(post, member).should.be.true();
        });

        it('should not error out if the slug associated with a tier is only 1 character in length', async function () {
            const post = {visibility: 'tiers', tiers: [{slug: 'x'}]};
            const member = {id: 'test', status: 'paid', products: [{
                slug: 'x'
            }]};

            (() => checkPostAccess(post, member)).should.not.throw();
        });

        it('should block access to members only post without member', async function () {
            const post = {visibility: 'members'};
            const member = null;
            checkPostAccess(post, member).should.be.false();
        });

        it('should block access to paid members only post without member', async function () {
            const post = {visibility: 'paid'};
            const member = null;
            checkPostAccess(post, member).should.be.false();
        });

        it('should block access to paid members only posts for free members', async function () {
            const post = {visibility: 'paid'};
            const member = {id: 'test', status: 'free'};
            checkPostAccess(post, member).should.be.false();
        });

        it('should block access to specific tiers only post without tiers list', async function () {
            const post = {visibility: 'tiers'};
            const member = {id: 'test'};
            checkPostAccess(post, member).should.be.false();
        });

        it('should block access to tiers only post for members not on allowed tier', async function () {
            const post = {visibility: 'tiers', tiers: [{slug: 'test-tier'}]};
            const member = {id: 'test', status: 'paid', products: [{
                slug: 'test-tier-2'
            }]};
            checkPostAccess(post, member).should.be.false();
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
