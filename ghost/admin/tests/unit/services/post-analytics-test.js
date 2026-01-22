import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {settled} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: post-analytics', function () {
    setupTest();

    let service;
    let ajaxStub;
    let ghostPathsStub;
    let settingsStub;

    beforeEach(function () {
        service = this.owner.lookup('service:post-analytics');
        
        // Stub dependencies
        ajaxStub = sinon.stub();
        ghostPathsStub = {
            url: {
                api: sinon.stub()
            }
        };
        settingsStub = {
            webAnalyticsEnabled: true,
            membersTrackSources: true
        };

        service.ajax = {request: ajaxStub};
        service.ghostPaths = ghostPathsStub;
        service.settings = settingsStub;
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('loadVisitorCounts', function () {
        it('returns early if no post UUIDs provided', async function () {
            const result = await service.loadVisitorCounts([]);
            expect(result).to.be.undefined;
            expect(ajaxStub.called).to.be.false;
        });

        it('returns early if web analytics is disabled', async function () {
            settingsStub.webAnalyticsEnabled = false;
            const result = await service.loadVisitorCounts(['uuid1']);
            expect(result).to.be.undefined;
            expect(ajaxStub.called).to.be.false;
        });

        it('does not fetch already fetched UUIDs', async function () {
            service._fetchedUuids.add('uuid1');
            const result = await service.loadVisitorCounts(['uuid1']);
            expect(result).to.be.undefined;
            expect(ajaxStub.called).to.be.false;
        });

        it('fetches visitor counts for new UUIDs', async function () {
            ghostPathsStub.url.api.returns('/stats/posts-visitor-counts');
            ajaxStub.resolves({
                stats: [{
                    data: {
                        visitor_counts: {
                            uuid1: 100,
                            uuid2: 200
                        }
                    }
                }]
            });

            await service.loadVisitorCounts(['uuid1', 'uuid2']);
            await settled();

            expect(ajaxStub.calledOnce).to.be.true;
            expect(ajaxStub.firstCall.args[1].method).to.equal('POST');
            expect(ajaxStub.firstCall.args[1].data).to.equal(JSON.stringify({postUuids: ['uuid1', 'uuid2']}));
            expect(service.visitorCounts).to.deep.equal({
                uuid1: 100,
                uuid2: 200
            });
        });

        it('handles API errors gracefully', async function () {
            ghostPathsStub.url.api.returns('/stats/posts-visitor-counts');
            ajaxStub.rejects(new Error('API Error'));

            await service.loadVisitorCounts(['uuid1']);
            await settled();

            expect(service.visitorCounts).to.deep.equal({});
            expect(service._fetchedUuids.has('uuid1')).to.be.false; // Should be removed on error
        });

        it('merges with existing visitor counts', async function () {
            service.visitorCounts = {existing: 50};
            ghostPathsStub.url.api.returns('/stats/posts-visitor-counts');
            ajaxStub.resolves({
                stats: [{
                    data: {
                        visitor_counts: {
                            uuid1: 100
                        }
                    }
                }]
            });

            await service.loadVisitorCounts(['uuid1']);
            await settled();

            expect(service.visitorCounts).to.deep.equal({
                existing: 50,
                uuid1: 100
            });
        });
    });

    describe('getVisitorCount', function () {
        it('returns visitor count for UUID', function () {
            service.visitorCounts = {uuid1: 100};
            expect(service.getVisitorCount('uuid1')).to.equal(100);
        });

        it('returns null for unknown UUID', function () {
            service.visitorCounts = {uuid1: 100};
            expect(service.getVisitorCount('uuid2')).to.be.null;
        });

        it('returns null when visitorCounts is null', function () {
            service.visitorCounts = null;
            expect(service.getVisitorCount('uuid1')).to.be.null;
        });
    });

    describe('loadMemberCounts', function () {
        it('returns early if no posts provided', async function () {
            const result = await service.loadMemberCounts([]);
            expect(result).to.be.undefined;
            expect(ajaxStub.called).to.be.false;
        });

        it('returns early if member tracking is disabled', async function () {
            service.settings.membersTrackSources = false;
            const result = await service.loadMemberCounts([{id: '1', uuid: 'uuid1'}]);
            expect(result).to.be.undefined;
            expect(ajaxStub.called).to.be.false;
        });

        it('does not fetch already fetched post IDs', async function () {
            service._fetchedMemberIds.add('1');
            const result = await service.loadMemberCounts([{id: '1', uuid: 'uuid1'}]);
            expect(result).to.be.undefined;
            expect(ajaxStub.called).to.be.false;
        });

        it('fetches member counts for new posts', async function () {
            ghostPathsStub.url.api.returns('/stats/posts-member-counts');
            ajaxStub.resolves({
                stats: [{
                    1: {free_members: 10, paid_members: 5},
                    2: {free_members: 20, paid_members: 15}
                }]
            });

            const posts = [
                {id: '1', uuid: 'uuid1'},
                {id: '2', uuid: 'uuid2'}
            ];

            await service.loadMemberCounts(posts);
            await settled();

            expect(ajaxStub.calledOnce).to.be.true;
            expect(ajaxStub.firstCall.args[1].method).to.equal('POST');
            expect(ajaxStub.firstCall.args[1].data).to.equal(JSON.stringify({postIds: ['1', '2']}));
            expect(service.memberCounts).to.deep.equal({
                uuid1: {free: 10, paid: 5},
                uuid2: {free: 20, paid: 15}
            });
        });

        it('handles API errors gracefully', async function () {
            ghostPathsStub.url.api.returns('/stats/posts-member-counts');
            ajaxStub.rejects(new Error('API Error'));

            const posts = [{id: '1', uuid: 'uuid1'}];
            await service.loadMemberCounts(posts);
            await settled();

            expect(service.memberCounts).to.deep.equal({});
            expect(service._fetchedMemberIds.has('1')).to.be.false; // Should be removed on error
        });

        it('merges with existing member counts', async function () {
            service.memberCounts = {existing: {free: 5, paid: 2}};
            ghostPathsStub.url.api.returns('/stats/posts-member-counts');
            ajaxStub.resolves({
                stats: [{
                    1: {free_members: 10, paid_members: 5}
                }]
            });

            const posts = [{id: '1', uuid: 'uuid1'}];
            await service.loadMemberCounts(posts);
            await settled();

            expect(service.memberCounts).to.deep.equal({
                existing: {free: 5, paid: 2},
                uuid1: {free: 10, paid: 5}
            });
        });
    });

    describe('getMemberCounts', function () {
        it('returns member counts for UUID', function () {
            service.memberCounts = {uuid1: {free: 10, paid: 5}};
            expect(service.getMemberCounts('uuid1')).to.deep.equal({free: 10, paid: 5});
        });

        it('returns null for unknown UUID', function () {
            service.memberCounts = {uuid1: {free: 10, paid: 5}};
            expect(service.getMemberCounts('uuid2')).to.be.null;
        });

        it('returns null when memberCounts is null', function () {
            service.memberCounts = null;
            expect(service.getMemberCounts('uuid1')).to.be.null;
        });
    });

    describe('reset', function () {
        it('clears all cached data', function () {
            service.visitorCounts = {uuid1: 100};
            service.memberCounts = {uuid1: {free: 10, paid: 5}};
            service._fetchedUuids.add('uuid1');
            service._fetchedMemberIds.add('1');

            service.reset();

            expect(service.visitorCounts).to.deep.equal({});
            expect(service.memberCounts).to.deep.equal({});
            expect(service._fetchedUuids.size).to.equal(0);
            expect(service._fetchedMemberIds.size).to.equal(0);
        });
    });
}); 