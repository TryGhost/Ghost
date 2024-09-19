import Service from '@ember/service';
import sinon from 'sinon';
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
        it('generates a key for a post with an id', function () {
            const revisionTimestamp = Date.now();
            const key = this.service.generateKey({id: 'test', revisionTimestamp});
            expect(key).to.equal(`post-revision-test-${revisionTimestamp}`);
        });
        
        it('generates a key for a post without a post id', function () {
            const revisionTimestamp = Date.now();
            const key = this.service.generateKey({id: 'draft', revisionTimestamp});
            expect(key).to.equal(`post-revision-draft-${revisionTimestamp}`);
        });
    });

    describe('save', function () {
        it('saves a revision without a post id', function () {
            // save a revision
            this.service.save('post', {id: 'draft', lexical: 'test'});
            // grab the key of the saved revision
            const revisions = this.service.findAll();
            const key = Object.keys(revisions)[0];
            const revision = this.service.find(key);
            expect(key).to.match(/post-revision-draft-\d+/);
            expect(revision.id).to.equal('draft');
            expect(revision.lexical).to.equal('test');
        });

        it('saves a revision with a post id', function () {
            // save a revision
            const revisionTimestamp = Date.now();
            this.service.save('post', {id: 'test-id', lexical: 'test', revisionTimestamp});
            // grab the key of the saved revision
            const revisions = this.service.findAll();
            const key = Object.keys(revisions)[0];
            expect(key).to.match(/post-revision-test-id-\d+/);
            expect(this.service.find(key)).to.deep.equal({id: 'test-id', lexical: 'test', revisionTimestamp, type: 'post'});
        });
    });

    describe('find', function () {
        it('gets a revision by key', function () {
            // save a revision
            this.service.save('post', {lexical: 'test'});
            // grab the key of the saved revision
            const revisions = this.service.findAll();
            const key = Object.keys(revisions)[0];
            const result = this.service.find(key);
            expect(result.id).to.equal('draft');
            expect(result.lexical).to.equal('test');
            expect(result.revisionTimestamp).to.match(/\d+/);
        });
    });

    describe('findAll', function () {
        it('gets all revisions if no prefix is provided', function () {
            // save a revision
            this.service.save('post', {id: 'test-id', lexical: 'test'});
            this.service.save('post', {lexical: 'data-2'});
            const result = this.service.findAll();
            expect(Object.keys(result)).to.have.lengthOf(2);
        });

        it('gets revisions filtered by prefix', function () {
            // save a revision
            this.service.save('post', {id: 'test-id', lexical: 'test'});
            this.service.save('post', {lexical: 'data-2'});
            const result = this.service.findAll('post-revision-test-id');
            expect(Object.keys(result)).to.have.lengthOf(1);
        });
    });

    describe('findByPostId', function () {
        it('gets all revisions for a post id', async function () {
            // save a revision
            this.service.save('post', {id: 'test-id', lexical: 'test'});
            this.service.save('post', {lexical: 'data-2'});
            await sleep(2);
            this.service.save('post', {id: 'test-id', lexical: 'data-3'});
            const result = this.service.findByPostId('test-id');
            expect(Object.keys(result)).to.have.lengthOf(2);
        });

        it('gets all revisions without an id if no id is provided', async function () {
            // save a revision
            this.service.save('post', {id: 'test-id', lexical: 'data'});
            this.service.save('post', {lexical: 'data-2'});
            await sleep(1);
            this.service.save('post', {lexical: 'data-3'});
            const result = this.service.findByPostId();
            expect(Object.keys(result)).to.have.lengthOf(2);
        });
    });

    describe('keys', function () {
        it('returns an empty array if there are no revisions', function () {
            const result = this.service.keys();
            expect(result).to.deep.equal([]);
        });

        it('returns the keys for all revisions if not prefix is provided', function () {
            // save revision
            this.service.save('post', {id: 'test-id', lexical: 'data'});
            const result = this.service.keys();
            expect(Object.keys(result)).to.have.lengthOf(1);
            expect(result[0]).to.match(/post-revision-test-id-\d+/);
        });

        it('returns the keys filtered by prefix if provided', function () {
            // save revision
            this.service.save('post', {id: 'test-id', lexical: 'data'});
            this.service.save('post', {id: 'draft', lexical: 'data'});
            const result = this.service.keys('post-revision-test-id');
            expect(Object.keys(result)).to.have.lengthOf(1);
            expect(result[0]).to.match(/post-revision-test-id-\d+/);
        });
    });

    describe('remove', function () {
        it('removes the specified key', function () {
            // save revision
            this.service.save('post', {id: 'test-id', lexical: 'data'});
            this.service.save('post', {id: 'test-2', lexical: 'data'});
            const keys = this.service.keys();
            const keyToRemove = keys[0];
            this.service.remove(keyToRemove);
            const updatedKeys = this.service.keys();
            expect(updatedKeys).to.have.lengthOf(1);
            expect(this.service.find(keyToRemove)).to.be.null;
        });
    });

    describe('restore', function () {
        it('creates a new post based on the revision data', async function () {
            // stub out the store service
            let saveStub = sinon.stub().resolves({id: 'test-id'});
            let setStub = sinon.stub();
            let getStub = sinon.stub().returns('post');
            let queryRecordStub = sinon.stub().resolves({id: '1'});
            this.owner.register('service:store', Service.extend({
                createRecord: () => {
                    return {
                        id: 'new-id',
                        save: saveStub,
                        set: setStub,
                        get: getStub
                    };
                },
                queryRecord: queryRecordStub
            }));
            // create a post to restore
            const key = this.service.save('post', {id: 'test-id', authors: [{id: '1'}], lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"\\"{\\\\\\"root\\\\\\":{\\\\\\"children\\\\\\":[{\\\\\\"children\\\\\\":[{\\\\\\"detail\\\\\\":0,\\\\\\"format\\\\\\":0,\\\\\\"mode\\\\\\":\\\\\\"normal\\\\\\",\\\\\\"style\\\\\\":\\\\\\"\\\\\\",\\\\\\"text\\\\\\":\\\\\\"T\\\\\\",\\\\\\"type\\\\\\":\\\\\\"extended-text\\\\\\",\\\\\\"version\\\\\\":1}],\\\\\\"direction\\\\\\":\\\\\\"ltr\\\\\\",\\\\\\"format\\\\\\":\\\\\\"\\\\\\",\\\\\\"indent\\\\\\":0,\\\\\\"type\\\\\\":\\\\\\"paragraph\\\\\\",\\\\\\"version\\\\\\":1}],\\\\\\"direction\\\\\\":\\\\\\"ltr\\\\\\",\\\\\\"format\\\\\\":\\\\\\"\\\\\\",\\\\\\"indent\\\\\\":0,\\\\\\"type\\\\\\":\\\\\\"root\\\\\\",\\\\\\"version\\\\\\":1}}\\"","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'});
            // restore the post
            const post = await this.service.restore(key);

            // Ensure the post is saved
            expect(saveStub.calledOnce).to.be.true;

            // Restore should return the post object
            expect(post.id).to.equal('new-id');
        });
    });
});
