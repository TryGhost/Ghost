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
        localStorage.clear();
        this.service = this.owner.lookup('service:local-revisions');
        this.clock = sinon.useFakeTimers({now: this.t0, shouldAdvanceTime: true});
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
            const key = `${this.service._prefix}-draft-${this.t0.getTime()}`;
            expect(this.service.findOne(key)).to.deep.equal({test: 'data'});
        });

        it('saves a revision with a post id', function () {
            // save a revision
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data'});
            const key = `${this.service._prefix}-test-id-${this.t0.getTime()}`;
            expect(this.service.findOne(key)).to.deep.equal({post: {id: 'test-id'}, test: 'data'});
        });
    });

    describe('findOne', function () {
        it('gets a revision by key', function () {
            // save a revision
            this.service.performSaveRevision({test: 'data'});
            // grab the key of the saved revision
            const key = `${this.service._prefix}-draft-${this.t0.getTime()}`;
            expect(this.service.findOne(key)).to.deep.equal({test: 'data'});
        });
    });

    describe('findAll', function () {
        it('gets all revisions', function () {
            // save a revision
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data'});
            this.service.performSaveRevision({test: 'data-2'});
            const result = this.service.findAll();
            expect(Object.keys(result)).to.have.length(2);
        });
    });

    describe('findByPostId', function () {
        it('gets all revisions for a post id', function () {
            // save a revision
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data'});
            this.service.performSaveRevision({test: 'data-2'});
            // advance the clock by 1ms to create another revision
            this.clock.tick(1);
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data-3'});
            const result = this.service.findByPostId('test-id');
            expect(Object.keys(result)).to.have.length(2);
        });

        it('gets all revisions without an id if no id is provided', function () {
            // save a revision
            this.service.performSaveRevision({post: {id: 'test-id'}, test: 'data'});
            this.service.performSaveRevision({test: 'data-2'});
            const result = this.service.findByPostId();
            expect(Object.keys(result)).to.have.length(1);
        });
    });

    describe('saveRevisionTask', function () {
        it('saves a revision immediately if no revision has been saved yet', function () {
            this.service.saveRevisionTask.perform({test: 'data'});
            const key = `${this.service._prefix}-draft-${this.t0.getTime()}`;
            expect(this.service.findOne(key)).to.deep.equal({test: 'data'});
        });

        it('does not save a revision if a revision has been saved recently', function () {
            this.service.saveRevisionTask.perform({test: 'data'});
            this.clock.tick(this.service.MIN_REVISION_TIME - 1);
            this.service.saveRevisionTask.perform({test: 'data-2'});
            expect(Object.keys(this.service.findAll())).to.have.length(1);
        });

        it('saves a revisions if a revision has not been saved recently', function () {
            this.service.saveRevisionTask.perform({test: 'data'});
            this.clock.tick(this.service.MIN_REVISION_TIME + 1);
            this.service.saveRevisionTask.perform({test: 'data-2'});
            expect(Object.keys(this.service.findAll())).to.have.length(2);
        });
    });
});