import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: post', function () {
    setupTest();

    let store;

    beforeEach(function () {
        store = this.owner.lookup('service:store');
    });

    it('has a validation type of "post"', function () {
        const model = store.createRecord('post');

        expect(model.validationType).to.equal('post');
    });

    it('isPublished, isDraft and isScheduled are correct', function () {
        const model = store.createRecord('post', {
            status: 'published'
        });

        expect(model.get('isPublished')).to.be.ok;
        expect(model.get('isDraft')).to.not.be.ok;
        expect(model.get('isScheduled')).to.not.be.ok;

        run(function () {
            model.set('status', 'draft');

            expect(model.get('isPublished')).to.not.be.ok;
            expect(model.get('isDraft')).to.be.ok;
            expect(model.get('isScheduled')).to.not.be.ok;
        });

        run(function () {
            model.set('status', 'scheduled');

            expect(model.get('isScheduled')).to.be.ok;
            expect(model.get('isPublished')).to.not.be.ok;
            expect(model.get('isDraft')).to.not.be.ok;
        });
    });

    it('isAuthoredByUser is correct', function () {
        const user1 = store.createRecord('user', {id: 'abcd1234'});
        const user2 = store.createRecord('user', {id: 'wxyz9876'});

        const model = store.createRecord('post', {
            authors: [user1]
        });

        expect(model.isAuthoredByUser(user1)).to.be.ok;

        run(function () {
            model.set('authors', [user2]);

            expect(model.isAuthoredByUser(user1)).to.not.be.ok;
        });
    });

    it('updateTags removes and deletes old tags', function () {
        const model = store.createRecord('post');

        run(this, function () {
            const modelTags = model.get('tags');
            const tag1 = store.createRecord('tag', {id: '1'});
            const tag2 = store.createRecord('tag', {id: '2'});
            const tag3 = store.createRecord('tag');

            // During testing a record created without an explicit id will get
            // an id of 'fixture-n' instead of null
            tag3.set('id', null);

            modelTags.pushObject(tag1);
            modelTags.pushObject(tag2);
            modelTags.pushObject(tag3);

            expect(model.get('tags.length')).to.equal(3);

            model.updateTags();

            expect(model.get('tags.length')).to.equal(2);
            expect(model.get('tags.firstObject.id')).to.equal('1');
            expect(model.get('tags').objectAt(1).get('id')).to.equal('2');
            expect(tag1.get('isDeleted')).to.not.be.ok;
            expect(tag2.get('isDeleted')).to.not.be.ok;
            expect(tag3.get('isDeleted')).to.be.ok;
        });
    });
});
