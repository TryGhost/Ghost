/* jshint expr:true */
import Ember from 'ember';
import { expect } from 'chai';
import {
  describeComponent,
  it
} from 'ember-mocha';

describeComponent(
    'gh-tags-input',
    'GhTagsInputComponent',
    {
        needs: ['helper:is-equal']
    },
    function () {
        var post = Ember.Object.create({
            id: 1,
            tags: Ember.A()
        });

        beforeEach(function () {
            var store = Ember.Object.create({
                    tags: Ember.A(),

                    find: function () {
                        return Ember.RSVP.resolve(this.get('tags'));
                    },

                    createRecord: function (name, opts) {
                        return Ember.Object.create({
                            isNew: true,
                            isDeleted: false,

                            name: opts.name,

                            deleteRecord: function () {
                                this.set('isDeleted', true);
                            }
                        });
                    }
                });

            store.get('tags').pushObject(Ember.Object.create({
                id: 1,
                name: 'Test1'
            }));
            store.get('tags').pushObject(Ember.Object.create({
                id: 2,
                name: 'Test2'
            }));

            this.subject().set('store', store);
        });

        afterEach(function () {
            post.get('tags').clear(); // reset tags
        });

        it('renders with null post', function () {
            // creates the component instance
            var component = this.subject();
            expect(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            expect(component._state).to.equal('inDOM');
        });

        it('correctly loads all tags', function () {
            var component = this.subject();

            this.render();

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(0);
        });

        it('correctly loads & filters tags when post has tags', function () {
            var component = this.subject();

            post.get('tags').pushObject(Ember.Object.create({
                id: 1,
                name: 'Test1'
            }));

            this.render();

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(1);
            expect(component.get('currentTags.length')).to.equal(1);
            expect(component.get('unassignedTags').findBy('id', 1)).to.not.exist;
            expect(component.get('unassignedTags').findBy('id', 2)).to.exist;
        });

        it('correctly adds new tag to currentTags', function () {
            var component = this.subject();

            this.render();

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(0);

            Ember.run(function () {
                component.send('addTag', 'Test3');
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(1);
            expect(component.get('isDirty')).to.be.true;
            expect(component.get('currentTags').findBy('name', 'Test3')).to.exist;
        });

        it('correctly adds existing tag to currentTags', function () {
            var component = this.subject();

            this.render();

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(0);

            Ember.run(function () {
                component.send('addTag', 'Test2');
            });

            expect(component.get('unassignedTags.length')).to.equal(1);
            expect(component.get('currentTags.length')).to.equal(1);
            expect(component.get('isDirty')).to.be.true;
            expect(component.get('currentTags').findBy('name', 'Test2')).to.exist;
            expect(component.get('unassignedTags').findBy('name', 'Test2')).to.not.exist;
        });

        it('doesn\'t allow duplicate tags to be added', function () {
            var component = this.subject();

            this.render();

            post.get('tags').pushObject(Ember.Object.create({
                id: 1,
                name: 'Test1'
            }));

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(1);
            expect(component.get('currentTags.length')).to.equal(1);

            Ember.run(function () {
                component.send('addTag', 'Test1');
            });

            expect(component.get('unassignedTags.length')).to.equal(1);
            expect(component.get('currentTags.length')).to.equal(1);
        });

        it('deletes new tag correctly', function () {
            var component = this.subject();

            this.render();

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(0);

            Ember.run(function () {
                component.send('addTag', 'Test3');
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(1);

            Ember.run(function () {
                component.send('deleteTag', 'Test3');
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(0);
            expect(component.get('currentTags').findBy('name', 'Test3')).to.not.exist;
            expect(component.get('unassignedTags').findBy('name', 'Test3')).to.not.exist;
        });

        it('deletes existing tag correctly', function () {
            var component = this.subject();

            this.render();

            post.get('tags').pushObject(Ember.Object.create({
                id: 1,
                name: 'Test1'
            }));

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(1);
            expect(component.get('currentTags.length')).to.equal(1);
            expect(component.get('unassignedTags').findBy('name', 'Test1')).to.not.exist;

            Ember.run(function () {
                component.send('deleteTag', 'Test1');
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(0);
            expect(component.get('unassignedTags').findBy('name', 'Test1')).to.exist;
        });

        it('creates tag with leftover text when component is de-focused', function () {
            var component = this.subject();

            this.render();

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(0);

            component.$('#tag-input').typeahead('val', 'Test3');
            component.focusOut(); // simluate de-focus

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(1);
        });

        it('sets highlight index to length-1 if it is null and modifier is negative', function () {
            var component = this.subject();

            this.render();

            post.get('tags').pushObject(Ember.Object.create({
                id: 3,
                name: 'Test3'
            }));

            post.get('tags').pushObject(Ember.Object.create({
                id: 4,
                name: 'Test4'
            }));

            post.get('tags').pushObject(Ember.Object.create({
                id: 5,
                name: 'Test5'
            }));

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(3);

            Ember.run(function () {
                component.updateHighlightIndex(-1);
            });

            expect(component.get('highlightIndex')).to.equal(2);
        });

        it('sets highlight index to 0 if it is null and modifier is positive', function () {
            var component = this.subject();

            this.render();

            post.get('tags').pushObject(Ember.Object.create({
                id: 3,
                name: 'Test3'
            }));

            post.get('tags').pushObject(Ember.Object.create({
                id: 4,
                name: 'Test4'
            }));

            post.get('tags').pushObject(Ember.Object.create({
                id: 5,
                name: 'Test5'
            }));

            Ember.run(function () {
                component.set('post', post);
            });

            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(3);

            Ember.run(function () {
                component.updateHighlightIndex(1);
            });

            expect(component.get('highlightIndex')).to.equal(0);
        });

        it('increments highlight index correctly (no reset)', function () {
            var component = this.subject();

            this.render();

            post.get('tags').pushObject(Ember.Object.create({
                id: 3,
                name: 'Test3'
            }));

            post.get('tags').pushObject(Ember.Object.create({
                id: 4,
                name: 'Test4'
            }));

            post.get('tags').pushObject(Ember.Object.create({
                id: 5,
                name: 'Test5'
            }));

            Ember.run(function () {
                component.set('post', post);
                component.set('highlightIndex', 1);
            });

            expect(component.get('highlightIndex')).to.equal(1);
            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(3);

            Ember.run(function () {
                component.updateHighlightIndex(1);
            });

            expect(component.get('highlightIndex')).to.equal(2);

            Ember.run(function () {
                component.updateHighlightIndex(-1);
            });

            expect(component.get('highlightIndex')).to.equal(1);
        });

        it('increments highlight index correctly (with reset)', function () {
            var component = this.subject();

            this.render();

            post.get('tags').pushObject(Ember.Object.create({
                id: 3,
                name: 'Test3'
            }));

            post.get('tags').pushObject(Ember.Object.create({
                id: 4,
                name: 'Test4'
            }));

            post.get('tags').pushObject(Ember.Object.create({
                id: 5,
                name: 'Test5'
            }));

            Ember.run(function () {
                component.set('post', post);
                component.set('highlightIndex', 2);
            });

            expect(component.get('highlightIndex')).to.equal(2);
            expect(component.get('unassignedTags.length')).to.equal(2);
            expect(component.get('currentTags.length')).to.equal(3);

            Ember.run(function () {
                component.updateHighlightIndex(1);
            });

            expect(component.get('highlightIndex')).to.be.null;

            Ember.run(function () {
                component.set('highlightIndex', 0);
            });

            expect(component.get('highlightIndex')).to.equal(0);

            Ember.run(function () {
                component.updateHighlightIndex(-1);
            });

            expect(component.get('highlightIndex')).to.be.null;
        });
    }
);
