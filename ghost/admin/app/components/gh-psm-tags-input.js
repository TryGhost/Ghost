import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {sort} from '@ember/object/computed';

export default Component.extend({

    store: service(),

    // public attrs
    post: null,
    tagName: '',

    // internal attrs
    _availableTags: null,

    availableTags: sort('_availableTags.[]', function (tagA, tagB) {
        // ignorePunctuation means the # in internal tag names is ignored
        return tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true});
    }),

    availableTagNames: computed('availableTags.@each.name', function () {
        return this.availableTags.map(tag => tag.name.toLowerCase());
    }),

    init() {
        this._super(...arguments);
        // perform a background query to fetch all users and set `availableTags`
        // to a live-query that will be immediately populated with what's in the
        // store and be updated when the above query returns
        this.store.query('tag', {limit: 'all'});
        this.set('_availableTags', this.store.peekAll('tag'));
    },

    actions: {
        matchTags(tagName, term) {
            return tagName.toLowerCase() === term.trim().toLowerCase();
        },

        hideCreateOptionOnMatchingTag(term) {
            return !this.availableTagNames.includes(term.toLowerCase());
        },

        updateTags(newTags) {
            let currentTags = this.get('post.tags');

            // destroy new+unsaved tags that are no longer selected
            currentTags.forEach(function (tag) {
                if (!newTags.includes(tag) && tag.get('isNew')) {
                    tag.destroyRecord();
                }
            });

            // update tags
            return this.set('post.tags', newTags);
        },

        createTag(tagName) {
            let currentTags = this.get('post.tags');
            let currentTagNames = currentTags.map(tag => tag.get('name').toLowerCase());
            let tagToAdd;

            tagName = tagName.trim();

            // abort if tag is already selected
            if (currentTagNames.includes(tagName.toLowerCase())) {
                return;
            }

            // find existing tag if there is one
            tagToAdd = this._findTagByName(tagName);

            // create new tag if no match
            if (!tagToAdd) {
                tagToAdd = this.store.createRecord('tag', {
                    name: tagName
                });

                // set to public/internal based on the tag name
                tagToAdd.updateVisibility();
            }

            // push tag onto post relationship
            return currentTags.pushObject(tagToAdd);
        }
    },

    // methods

    _findTagByName(name) {
        let withMatchingName = function (tag) {
            return tag.name.toLowerCase() === name.toLowerCase();
        };
        return this.availableTags.find(withMatchingName);
    }
});
