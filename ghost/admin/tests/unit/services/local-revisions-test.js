import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

const sleep = ms => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

describe('Unit: Service: local-revisions', function () {
    setupTest();

    this.beforeEach(function () {
        this.service = this.owner.lookup('service:local-revisions');
        this.service.clear();
    });

    it('exists', function () {
        expect(this.service).to.be.ok;
    });

    describe('generateKey', function () {
        it('generates a key with a post id', function () {
            const key = this.service.generateKey({id: 'test'});
            expect(key).to.match(/post-revision-test-\d+/);
        });
        
        it('generates a key without a post id', function () {
            const key = this.service.generateKey({});
            expect(key).to.match(/post-revision-draft-\d+/);
        });
    });

    describe('save', function () {
        it('saves a revision without a post id', function () {
            // save a revision
            this.service.save({lexical: 'test'});
            // grab the key of the saved revision
            const revisions = this.service.getAll();
            const key = Object.keys(revisions)[0];
            expect(key).to.match(/post-revision-draft-\d+/);
            expect(this.service.get(key)).to.deep.equal({lexical: 'test'});
        });

        it('saves a revision with a post id', function () {
            // save a revision
            this.service.save({id: 'test-id', lexical: 'test'});
            // grab the key of the saved revision
            const revisions = this.service.getAll();
            const key = Object.keys(revisions)[0];
            expect(key).to.match(/post-revision-test-id-\d+/);
            expect(this.service.get(key)).to.deep.equal({id: 'test-id', lexical: 'test'});
        });
    });

    describe('get', function () {
        it('gets a revision by key', function () {
            // save a revision
            this.service.save({lexical: 'test'});
            // grab the key of the saved revision
            const revisions = this.service.getAll();
            const key = Object.keys(revisions)[0];
            const result = this.service.get(key);
            expect(result).to.deep.equal({
                lexical: 'test'
            });
        });
    });

    describe('getAll', function () {
        it('gets all revisions if no prefix is provided', function () {
            // save a revision
            this.service.save({id: 'test-id', lexical: 'test'});
            this.service.save({test: 'data-2'});
            const result = this.service.getAll();
            expect(Object.keys(result)).to.have.lengthOf(2);
        });
    });

    describe('getByPostId', function () {
        it('gets all revisions for a post id', async function () {
            // save a revision
            this.service.save({id: 'test-id', lexical: 'test'});
            this.service.save({lexical: 'data-2'});
            await sleep(2);
            this.service.save({id: 'test-id', lexical: 'data-3'});
            const result = this.service.getByPostId('test-id');
            expect(Object.keys(result)).to.have.lengthOf(2);
        });

        it('gets all revisions without an id if no id is provided', async function () {
            // save a revision
            this.service.save({id: 'test-id', lexical: 'data'});
            this.service.save({lexical: 'data-2'});
            await sleep(1);
            this.service.save({lexical: 'data-3'});
            const result = this.service.getByPostId();
            expect(Object.keys(result)).to.have.lengthOf(2);
        });
    });
});