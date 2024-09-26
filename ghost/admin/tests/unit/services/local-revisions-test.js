import * as Sentry from '@sentry/ember';
import Service from '@ember/service';
import sentryTestKit from 'sentry-testkit/browser';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {getSentryTestConfig} from 'ghost-admin/utils/sentry';
import {setupTest} from 'ember-mocha';
import {waitUntil} from '@ember/test-helpers';

const {sentryTransport, testkit} = sentryTestKit();

const sleep = ms => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

describe('Unit: Service: local-revisions', function () {
    setupTest();

    let localStore, setItemStub, getItemStub, removeItemStub, clearStub, localStorageMock;

    before(function () {
        Sentry.init(getSentryTestConfig(sentryTransport));
    });

    this.beforeEach(function () {
        // Reset the Sentry testkit
        testkit.reset();

        // Mock localStorage
        sinon.restore();
        localStore = {};
        getItemStub = sinon.stub().callsFake(key => localStore[key] || null
        );
        setItemStub = sinon.stub().callsFake((key, value) => localStore[key] = value + '');
        removeItemStub = sinon.stub().callsFake(key => delete localStore[key]);
        clearStub = sinon.stub().callsFake(() => localStore = {});
        localStorageMock = {
            getItem: getItemStub,
            setItem: setItemStub,
            removeItem: removeItemStub,
            clear: clearStub
        };

        // Create the service
        this.service = this.owner.lookup('service:local-revisions');
        this.service.storage = localStorageMock;
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

    describe('performSave', function () {
        it('saves a revision without a post id', function () {
            // save a revision
            const key = this.service.performSave('post', {id: 'draft', lexical: 'test', status: 'draft'});
            const revision = this.service.find(key);
            expect(key).to.match(/post-revision-draft-\d+/);
            expect(revision.id).to.equal('draft');
            expect(revision.lexical).to.equal('test');
        });

        it('saves a revision with a post id', function () {
            // save a revision
            const key = this.service.performSave('post', {id: 'test-id', lexical: 'test', status: 'draft'});
            const revision = this.service.find(key);
            expect(key).to.match(/post-revision-test-id-\d+/);
            expect(revision.id).to.equal('test-id');
            expect(revision.lexical).to.equal('test');
        });

        it('evicts the oldest version if localStorage is full', async function () {
            // save a few revisions
            const keyToRemove = this.service.performSave('post', {id: 'test-id', lexical: 'test', status: 'draft'});
            await sleep(1);
            this.service.performSave('post', {id: 'test-id', lexical: 'data-2'});
            await sleep(1);

            // Simulate a quota exceeded error
            const quotaError = new Error('QuotaExceededError');
            quotaError.name = 'QuotaExceededError';
            const callCount = setItemStub.callCount;
            setItemStub.onCall(callCount).throws(quotaError);
            const keyToAdd = this.service.performSave('post', {id: 'test-id', lexical: 'data-3', status: 'draft'});
            // Ensure the oldest revision was removed
            expect(this.service.find(keyToRemove)).to.be.null;

            // Ensure the latest revision saved
            expect(this.service.find(keyToAdd)).to.not.be.null;
        });

        it('evicts multiple oldest versions if localStorage is full', async function () {
            // save a few revisions
            const keyToRemove = this.service.performSave('post', {id: 'test-id-1', lexical: 'test', status: 'draft'});
            await sleep(1);
            const nextKeyToRemove = this.service.performSave('post', {id: 'test-id-2', lexical: 'data-2', status: 'draft'});
            await sleep(1);
            // Simulate a quota exceeded error
            const quotaError = new Error('QuotaExceededError');
            quotaError.name = 'QuotaExceededError';

            setItemStub.onCall(setItemStub.callCount).throws(quotaError);
            // remove calls setItem() to remove the key from the index
            // it's called twice for each quota error, hence the + 3
            setItemStub.onCall(setItemStub.callCount + 3).throws(quotaError);
            const keyToAdd = this.service.performSave('post', {id: 'test-id-3', lexical: 'data-3', status: 'draft'});

            // Ensure the oldest revision was removed
            expect(this.service.find(keyToRemove)).to.be.null;
            expect(this.service.find(nextKeyToRemove)).to.be.null;

            // Ensure the latest revision saved
            expect(this.service.find(keyToAdd)).to.not.be.null;
        });

        it('logs to Sentry when it has to evict older revisions', async function () {
            // save a few revisions
            this.service.performSave('post', {id: 'test-id', lexical: 'test', status: 'draft'});
            await sleep(1);
            this.service.performSave('post', {id: 'test-id', lexical: 'data-2', status: 'draft'});
            await sleep(1);

            // Simulate a quota exceeded error
            const quotaError = new Error('QuotaExceededError');
            quotaError.name = 'QuotaExceededError';
            setItemStub.onCall(setItemStub.callCount).throws(quotaError);
            this.service.performSave('post', {id: 'test-id', lexical: 'data-3', status: 'draft'});

            await waitUntil(() => testkit.reports().length > 0);
            expect(testkit.reports()).to.have.lengthOf(1);

            const report = testkit.reports()[0];
            expect(report.tags.localRevisions).to.equal('quotaExceeded');
            expect(report.message).to.equal('LocalStorage quota exceeded. Removing old revisions.');
        });

        it('logs to sentry when it is unable to save a revision due to quota exceeded', async function () {
            // Simulate a quota exceeded error
            const quotaError = new Error('QuotaExceededError');
            quotaError.name = 'QuotaExceededError';
            setItemStub.onCall(setItemStub.callCount).throws(quotaError);
            this.service.performSave('post', {id: 'test-id', lexical: 'data-3', status: 'draft'});

            await waitUntil(() => testkit.reports().length > 0);
            expect(testkit.reports()).to.have.lengthOf(1);

            const report = testkit.reports()[0];
            expect(report.tags.localRevisions).to.equal('quotaExceededNoSpace');
            expect(report.message).to.equal('LocalStorage quota exceeded. Unable to save revision.');
        });

        it('logs to sentry if an unexpected error occurs while saving a revision', async function () {
            // Simulate an unexpected error
            const error = new Error('Test error');
            setItemStub.throws(error);
            this.service.performSave('post', {id: 'test-id', lexical: 'data-3', status: 'draft'});

            await waitUntil(() => testkit.reports().length > 0);
            expect(testkit.reports()).to.have.lengthOf(1);

            const report = testkit.reports()[0];
            expect(report.error.message).to.equal('Test error');
            expect(report.tags.localRevisions).to.equal('saveError');
        });

        it('keeps only the latest 5 revisions for a given post ID', async function () {
            const postId = 'test-id';
            const revisionCount = 7;

            // Save 7 revisions for the same post ID
            for (let i = 0; i < revisionCount; i++) {
                await sleep(1); // Ensure unique timestamps
                this.service.performSave('post', {id: postId, lexical: `test-${i}`, status: 'draft'});
            }

            // Get all revisions for the post ID
            const revisions = this.service.findAll(`post-revision-${postId}`);

            // Check that only 5 revisions are kept
            expect(revisions).to.have.lengthOf(5);

            // Check that the kept revisions are the latest ones
            for (let i = 0; i < 5; i++) {
                expect(revisions[i].lexical).to.equal(`test-${revisionCount - 1 - i}`);
            }
        });

        it('does not limit revisions for drafts', async function () {
            const postId = 'draft';
            const revisionCount = 7;

            // Save 7 revisions for a draft
            for (let i = 0; i < revisionCount; i++) {
                await sleep(1); // Ensure unique timestamps
                this.service.performSave('post', {id: postId, lexical: `test-${i}`, status: 'draft'});
            }

            // Get all revisions for the draft
            const revisions = this.service.findAll(`post-revision-${postId}`);

            // Check that all 7 revisions are kept for the draft
            expect(revisions).to.have.lengthOf(revisionCount);

            // Check that all revisions are present
            for (let i = 0; i < revisionCount; i++) {
                expect(revisions[i].lexical).to.equal(`test-${revisionCount - 1 - i}`);
            }
        });
    });

    describe('scheduleSave', function () {
        it('saves a revision if the post is a draft', function () {
            // save a revision
            this.service.scheduleSave('post', {id: 'draft', lexical: 'test', status: 'draft'});
            const key = this.service.keys()[0];
            const revision = this.service.find(key);
            expect(key).to.match(/post-revision-draft-\d+/);
            expect(revision.id).to.equal('draft');
            expect(revision.lexical).to.equal('test');
        });

        it('does not save a revision if the post is not a draft', function () {
            // save a revision
            this.service.scheduleSave('post', {id: 'draft', lexical: 'test', status: 'published'});
            const keys = this.service.keys();
            expect(keys).to.have.lengthOf(0);
        });

        it('does not save a revision more than once if scheduled multiple times', async function () {
            // interval is set to 200 ms in testing
            this.service.scheduleSave('post', {id: 'draft', lexical: 'test', status: 'draft'});
            await sleep(40);
            this.service.scheduleSave('post', {id: 'draft', lexical: 'test'});
            const keys = this.service.keys();
            expect(keys).to.have.lengthOf(1);
        });

        it('saves another revision if it has been longer than the revision interval', async function () {
            // interval is set to 200 ms in testing
            this.service.scheduleSave('post', {id: 'draft', lexical: 'test', status: 'draft'});
            await sleep(100);
            this.service.scheduleSave('post', {id: 'draft', lexical: 'test', status: 'draft'});
            const keys = this.service.keys();
            expect(keys).to.have.lengthOf(2);
        });

        it('logs any errors that occur during the save to Sentry', async function () {
            sinon.stub(this.service, 'performSave').throws(new Error('Test error'));

            this.service.scheduleSave('post', {id: 'draft', lexical: 'test', status: 'draft'});

            await waitUntil(() => testkit.reports().length > 0);
            expect(testkit.reports()).to.have.lengthOf(1);

            const report = testkit.reports()[0];
            expect(report.error.message).to.equal('Test error');
            expect(report.tags.localRevisions).to.equal('saveTaskError');
        });
    });

    describe('find', function () {
        it('gets a revision by key', function () {
            // save a revision
            const key = this.service.performSave('post', {lexical: 'test', status: 'draft'});
            const result = this.service.find(key);
            expect(result.id).to.equal('draft');
            expect(result.lexical).to.equal('test');
            expect(result.revisionTimestamp).to.match(/\d+/);
        });

        it('returns null if the key does not exist', function () {
            const result = this.service.find('non-existent-key');
            expect(result).to.be.null;
        });
    });

    describe('findAll', function () {
        it('gets all revisions if no prefix is provided', function () {
            // save a revision
            this.service.performSave('post', {id: 'test-id', lexical: 'test', status: 'draft'});
            this.service.performSave('post', {lexical: 'data-2', status: 'draft'});
            const result = this.service.findAll();
            expect(Object.keys(result)).to.have.lengthOf(2);
        });

        it('gets revisions filtered by prefix', function () {
            // save a revision
            this.service.performSave('post', {id: 'test-id', lexical: 'test', status: 'draft'});
            this.service.performSave('post', {lexical: 'data-2', status: 'draft'});
            const result = this.service.findAll('post-revision-test-id');
            expect(Object.keys(result)).to.have.lengthOf(1);
        });

        it('returns an empty object if there are no revisions', function () {
            const result = this.service.findAll();
            expect(result).to.deep.equal([]);
        });
    });

    describe('keys', function () {
        it('returns an empty array if there are no revisions', function () {
            const result = this.service.keys();
            expect(result).to.deep.equal([]);
        });

        it('returns the keys for all revisions if not prefix is provided', function () {
            // save revision
            this.service.performSave('post', {id: 'test-id', lexical: 'data', status: 'draft'});
            const result = this.service.keys();
            expect(Object.keys(result)).to.have.lengthOf(1);
            expect(result[0]).to.match(/post-revision-test-id-\d+/);
        });

        it('returns the keys filtered by prefix if provided', function () {
            // save revision
            this.service.performSave('post', {id: 'test-id', lexical: 'data', status: 'draft'});
            this.service.performSave('post', {id: 'draft', lexical: 'data', status: 'draft'});
            const result = this.service.keys('post-revision-test-id');
            expect(Object.keys(result)).to.have.lengthOf(1);
            expect(result[0]).to.match(/post-revision-test-id-\d+/);
        });
    });

    describe('remove', function () {
        it('removes the specified key', function () {
            // save revision
            const key = this.service.performSave('post', {id: 'test-id', lexical: 'data', status: 'draft'});
            this.service.performSave('post', {id: 'test-2', lexical: 'data', status: 'draft'});
            this.service.remove(key);
            const updatedKeys = this.service.keys();
            expect(updatedKeys).to.have.lengthOf(1);
            expect(this.service.find(key)).to.be.null;
        });

        it('does nothing if the key does not exist', function () {
            // save revision
            this.service.performSave('post', {id: 'test-id', lexical: 'data', status: 'draft'});
            this.service.performSave('post', {id: 'test-2', lexical: 'data', status: 'draft'});
            this.service.remove('non-existent-key');
            const updatedKeys = this.service.keys();
            expect(updatedKeys).to.have.lengthOf(2);
        });
    });

    describe('removeOldest', function () {
        it('removes the oldest revision', async function () {
            // save revision
            const keyToRemove = this.service.performSave('post', {id: 'test-id', lexical: 'data', status: 'draft'});
            await sleep(1);
            this.service.performSave('post', {id: 'test-2', lexical: 'data', status: 'draft'});
            await sleep(1);
            this.service.performSave('post', {id: 'test-3', lexical: 'data', status: 'draft'});
            this.service.removeOldest();
            const updatedKeys = this.service.keys();
            expect(updatedKeys).to.have.lengthOf(2);
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
            const key = this.service.performSave('post', {id: 'test-id', status: 'draft', authors: [{id: '1'}], lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"\\"{\\\\\\"root\\\\\\":{\\\\\\"children\\\\\\":[{\\\\\\"children\\\\\\":[{\\\\\\"detail\\\\\\":0,\\\\\\"format\\\\\\":0,\\\\\\"mode\\\\\\":\\\\\\"normal\\\\\\",\\\\\\"style\\\\\\":\\\\\\"\\\\\\",\\\\\\"text\\\\\\":\\\\\\"T\\\\\\",\\\\\\"type\\\\\\":\\\\\\"extended-text\\\\\\",\\\\\\"version\\\\\\":1}],\\\\\\"direction\\\\\\":\\\\\\"ltr\\\\\\",\\\\\\"format\\\\\\":\\\\\\"\\\\\\",\\\\\\"indent\\\\\\":0,\\\\\\"type\\\\\\":\\\\\\"paragraph\\\\\\",\\\\\\"version\\\\\\":1}],\\\\\\"direction\\\\\\":\\\\\\"ltr\\\\\\",\\\\\\"format\\\\\\":\\\\\\"\\\\\\",\\\\\\"indent\\\\\\":0,\\\\\\"type\\\\\\":\\\\\\"root\\\\\\",\\\\\\"version\\\\\\":1}}\\"","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'});
            // restore the post
            const post = await this.service.restore(key);

            // Ensure the post is saved
            expect(saveStub.calledOnce).to.be.true;

            // Restore should return the post object
            expect(post.id).to.equal('new-id');
        });
    });
});
