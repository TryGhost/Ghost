import Ember from 'ember';
import {
    describeModel,
    it
} from 'ember-mocha';

describeModel('post',
    {
        needs:['model:user', 'model:tag', 'model:role']
    },

    function () {
        it('has a validation type of "post"', function () {
            var model = this.subject();

            expect(model.validationType).to.equal('post');
        });

        it('isPublished and isDraft are correct', function () {
            var model = this.subject({
                status: 'published'
            });

            expect(model.get('isPublished')).to.be.ok;
            expect(model.get('isDraft')).to.not.be.ok;

            Ember.run(function () {
                model.set('status', 'draft');

                expect(model.get('isPublished')).to.not.be.ok;
                expect(model.get('isDraft')).to.be.ok;
            });
        });

        it('isAuthoredByUser is correct', function () {
            var model = this.subject({
                author_id: 15
            }),
            user = Ember.Object.create({id: '15'});

            expect(model.isAuthoredByUser(user)).to.be.ok;

            Ember.run(function () {
                model.set('author_id', 1);

                expect(model.isAuthoredByUser(user)).to.not.be.ok;
            });
        });

        it('updateTags removes and deletes old tags', function () {
            var model = this.subject();

            Ember.run(this, function () {
                var modelTags = model.get('tags'),
                    tag1 = this.store().createRecord('tag', {id: '1'}),
                    tag2 = this.store().createRecord('tag', {id: '2'}),
                    tag3 = this.store().createRecord('tag');

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
    }
);
