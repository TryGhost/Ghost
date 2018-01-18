import EmberObject from '@ember/object';
import {describe, it} from 'mocha';
import {run} from '@ember/runloop';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Model: post', function () {
    setupModelTest('post', {
        needs: [
            'model:user',
            'model:tag',
            'model:role',
            'service:ajax',
            'service:clock',
            'service:config',
            'service:feature',
            'service:ghostPaths',
            'service:lazyLoader',
            'service:notifications',
            'service:session',
            'service:settings'
        ]
    });

    it('has a validation type of "post"', function () {
        let model = this.subject();

        expect(model.validationType).to.equal('post');
    });

    it('isPublished, isDraft and isScheduled are correct', function () {
        let model = this.subject({
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
        let model = this.subject({
            authorId: 'abcd1234'
        });
        let user = EmberObject.create({id: 'abcd1234'});

        expect(model.isAuthoredByUser(user)).to.be.ok;

        run(function () {
            model.set('authorId', 'wxyz9876');

            expect(model.isAuthoredByUser(user)).to.not.be.ok;
        });
    });

    it('updateTags removes and deletes old tags', function () {
        let model = this.subject();

        run(this, function () {
            let modelTags = model.get('tags');
            let tag1 = this.store().createRecord('tag', {id: '1'});
            let tag2 = this.store().createRecord('tag', {id: '2'});
            let tag3 = this.store().createRecord('tag');

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
