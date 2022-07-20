const should = require('should');
const {checkPostAccess} = require('../../../../../core/server/services/members/content-gating');

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
});
