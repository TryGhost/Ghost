import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {sort} from '@ember/object/computed';
import {tagName} from '@ember-decorators/component';

@classic
@tagName('')
export default class GhPsmTagsInput extends Component {
    @service store;

    // public attrs
    post = null;

    // internal attrs
    _availableTags = null;

    @sort('_availableTags.[]', function (tagA, tagB) {
        // ignorePunctuation means the # in internal tag names is ignored
        return tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true});
    })
        availableTags;

    @computed('availableTags.@each.name')
    get availableTagNames() {
        return this.availableTags.map(tag => tag.name.toLowerCase());
    }

    init() {
        super.init(...arguments);
        // perform a background query to fetch all users and set `availableTags`
        // to a live-query that will be immediately populated with what's in the
        // store and be updated when the above query returns
        this.store.query('tag', {limit: 'all'});
        this.set('_availableTags', this.store.peekAll('tag'));
    }

    @action
    matchTags(tagNameAttr, term) {
        return tagNameAttr.toLowerCase() === term.trim().toLowerCase();
    }

    @action
    hideCreateOptionOnMatchingTag(term) {
        return !this.availableTagNames.includes(term.toLowerCase());
    }

    @action
    updateTags(newTags) {
        let currentTags = this.get('post.tags');

        // destroy new+unsaved tags that are no longer selected
        currentTags.forEach(function (tag) {
            if (!newTags.includes(tag) && tag.get('isNew')) {
                tag.destroyRecord();
            }
        });

        // update tags
        this.set('post.tags', newTags);
        if (this.savePostOnChange) {
            return this.savePostOnChange();
        }
    }

    @action
    createTag(tagNameAttr) {
        let currentTags = this.get('post.tags');
        let currentTagNames = currentTags.map(tag => tag.get('name').toLowerCase());
        let tagToAdd;

        tagNameAttr = tagNameAttr.trim();

        // abort if tag is already selected
        if (currentTagNames.includes(tagNameAttr.toLowerCase())) {
            return;
        }

        // find existing tag if there is one
        tagToAdd = this._findTagByName(tagNameAttr);

        // create new tag if no match
        if (!tagToAdd) {
            tagToAdd = this.store.createRecord('tag', {
                name: tagNameAttr
            });

            // set to public/internal based on the tag name
            tagToAdd.updateVisibility();
        }

        // push tag onto post relationship
        return currentTags.pushObject(tagToAdd);
    }

    // methods

    _findTagByName(name) {
        let withMatchingName = function (tag) {
            return tag.name.toLowerCase() === name.toLowerCase();
        };
        return this.availableTags.find(withMatchingName);
    }
}
