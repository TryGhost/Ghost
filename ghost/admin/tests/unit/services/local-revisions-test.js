import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: local-revisions', function () {
    setupTest();

    this.beforeAll(function () {
        this.t0 = new Date();
        this.clock = sinon.useFakeTimers();
    });

    this.beforeEach(function () {
        this.service = this.owner.lookup('service:local-revisions');
        this.clock = sinon.useFakeTimers({now: this.t0, shouldAdvanceTime: false});
    });

    this.afterEach(function () {
        this.clock.restore();
    });

    it('exists', function () {
        expect(this.service).to.be.ok;
    });

    describe('generateKey', function () {
        it('generates a key with a post id', function () {
            const key = this.service.generateKey({post: {id: 'test'}});
            expect(key).to.match(/post-revision-test-\d+/);
        });
        
        it('generates a key without a post id', function () {
            const key = this.service.generateKey({});
            expect(key).to.match(/post-revision-draft-\d+/);
        });
    });

    describe('performSaveRevision', function () {
        it('saves a revision without a post id', function () {
            // save a revision
            this.service.performSaveRevision({test: 'data'});
            // grab the key of the saved revision
            const revisions = this.service.getAll();
            const key = Object.keys(revisions)[0];
            expect(key).to.match(/post-revision-draft-\d+/);
            expect(this.service.get(key)).to.deep.equal({test: 'data'});
        });

        it('saves a revision with a post id', function () {
            // save a revision
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data'});
            // grab the key of the saved revision
            const revisions = this.service.getAll();
            const key = Object.keys(revisions)[0];
            expect(key).to.match(/post-revision-test-id-\d+/);
            expect(this.service.get(key)).to.deep.equal({post: {id: 'test-id'}, test: 'data'});
        });
    });

    describe('get', function () {
        it('gets a revision by key', function () {
            // save a revision
            this.service.performSaveRevision({test: 'data'});
            // grab the key of the saved revision
            const key = `${this.service._prefix}-draft-${this.t0.getTime()}`;
            expect(this.service.get(key)).to.deep.equal({test: 'data'});
        });
    });

    describe('getAll', function () {
        it('gets all revisions if no prefix is provided', function () {
            // save a revision
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data'});
            this.service.performSaveRevision({test: 'data-2'});
            const key1 = `${this.service._prefix}-test-id-${this.t0.getTime()}`;
            const key2 = `${this.service._prefix}-draft-${this.t0.getTime()}`;
            const expected = {
                [key1]: {post: {id: 'test-id'}, test: 'data'},
                [key2]: {test: 'data-2'}
            };
            expect(this.service.getAll()).to.deep.equal(expected);
        });
    });

    describe('getByPostId', function () {
        it('gets all revisions for a post id', function () {
            // save a revision
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data'});
            this.service.performSaveRevision({test: 'data-2'});
            // advance the clock by 1ms to create another revision
            this.clock.tick(1);
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data-3'});
            const key1 = `${this.service._prefix}-test-id-${this.t0.getTime()}`;
            const key2 = `${this.service._prefix}-test-id-${this.t0.getTime() + 1}`;
            const expected = {
                [key1]: {post: {id: 'test-id'}, test: 'data'},
                [key2]: {post: {id: 'test-id'}, test: 'data-3'}
            };
            expect(this.service.getByPostId('test-id')).to.deep.equal(expected);
        });

        it('gets all revisions without an id if no id is provided', function () {
            // save a revision
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data'});
            this.service.performSaveRevision({test: 'data-2'});
            const key2 = `${this.service._prefix}-draft-${this.t0.getTime()}`;
            const expected = {
                [key2]: {test: 'data-2'}
            };
            expect(this.service.getByPostId()).to.deep.equal(expected);
        });
    });

    describe('saveRevisionTask', function () {
        it('saves a revision immediately if no revision has been saved yet', function () {
            this.service.saveRevisionTask.perform({test: 'data'});
            const key = `${this.service._prefix}-draft-${this.t0.getTime()}`;
            expect(this.service.get(key)).to.deep.equal({test: 'data'});
        });

        it('does not save a revision if a revision has been saved recently', function () {
            this.service.saveRevisionTask.perform({test: 'data'});
            this.clock.tick(this.service.MIN_REVISION_TIME - 1);
            this.service.saveRevisionTask.perform({test: 'data-2'});
            expect(Object.keys(this.service.getAll())).to.have.length(1);
        });

        it('saves a revisions if a revision has not been saved recently', function () {
            this.service.saveRevisionTask.perform({test: 'data'});
            this.clock.tick(this.service.MIN_REVISION_TIME + 1);
            this.service.saveRevisionTask.perform({test: 'data-2'});
            expect(Object.keys(this.service.getAll())).to.have.length(2);
        });
    });
});