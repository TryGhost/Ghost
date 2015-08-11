/* global Bloodhound, key */
import Ember from 'ember';

/**
 * Ghost Tag Input Component
 *
 * Creates an input field that is used to input tags for a post.
 * @param  {Boolean} hasFocus       Whether or not the input is focused
 * @param  {DS.Model} post          The current post object to input tags for
 */
export default Ember.Component.extend({
    classNames: ['gh-input'],
    classNameBindings: ['hasFocus:focus'],

    // Uses the Ember-Data store directly, as it needs to create and get tag records
    store: Ember.inject.service(),

    hasFocus: false,
    post: null,
    highlightIndex: null,

    isDirty: false,
    isReloading: false,

    unassignedTags: Ember.A(), // tags that AREN'T assigned to this post
    currentTags: Ember.A(), // tags that ARE assigned to this post

    // Input field events
    click: function () {
        this.$('#tag-input').focus();
    },

    focusIn: function () {
        this.set('hasFocus', true);
        key.setScope('tags');
    },

    focusOut: function () {
        this.set('hasFocus', false);
        key.setScope('default');
        this.set('highlightIndex', null);
        // if there is text in the input field, create a tag with it
        if (this.$('#tag-input').val() !== '') {
            this.send('addTag', this.$('#tag-input').val());
        }
        this.saveTags();
    },

    keyPress: function (event) {
        var val = this.$('#tag-input').val(),
            isComma = ','.localeCompare(String.fromCharCode(event.keyCode || event.charCode)) === 0;

        if (isComma && val !== '') {
            event.preventDefault();
            this.send('addTag', val);
        }
    },

    // Tag Loading functions
    loadTagsOnInit: Ember.on('init', function () {
        var self = this;

        if (this.get('post')) {
            this.loadTags().then(function () {
                Ember.run.schedule('afterRender', self, 'initTypeahead');
            });
        }
    }),

    reloadTags: Ember.observer('post', function () {
        var self = this;

        this.loadTags().then(function () {
            self.reloadTypeahead(false);
        });
    }),

    loadTags: function () {
        var self = this,
            post = this.get('post');

        this.get('currentTags').clear();
        this.get('unassignedTags').clear();

        return this.get('store').find('tag', {limit: 'all'}).then(function (tags) {
            if (post.get('id')) { // if it's a new post, it won't have an id
                self.get('currentTags').pushObjects(post.get('tags').toArray());
            }

            tags.forEach(function (tag) {
                if (Ember.isEmpty(post.get('id')) || Ember.isEmpty(self.get('currentTags').findBy('id', tag.get('id')))) {
                    self.get('unassignedTags').pushObject(tag);
                }
            });

            return Ember.RSVP.resolve();
        });
    },

    // Key Binding functions
    bindKeys: function () {
        var self = this;

        key('enter, tab', 'tags', function (event) {
            var val = self.$('#tag-input').val();

            if (val !== '') {
                event.preventDefault();
                self.send('addTag', val);
            }
        });

        key('backspace', 'tags', function (event) {
            if (self.$('#tag-input').val() === '') {
                event.preventDefault();
                self.send('deleteTag');
            }
        });

        key('left', 'tags', function (event) {
            self.updateHighlightIndex(-1, event);
        });

        key('right', 'tags', function (event) {
            self.updateHighlightIndex(1, event);
        });
    },

    unbindKeys: function () {
        key.unbind('enter, tab', 'tags');
        key.unbind('backspace', 'tags');
        key.unbind('left', 'tags');
        key.unbind('right', 'tags');
    },

    didInsertElement: function () {
        this.bindKeys();
    },

    willDestroyElement: function () {
        this.unbindKeys();
        this.destroyTypeahead();
    },

    updateHighlightIndex: function (modifier, event) {
        if (this.$('#tag-input').val() === '') {
            var highlightIndex = this.get('highlightIndex'),
                length = this.get('currentTags.length'),
                newIndex;

            if (event) {
                event.preventDefault();
            }

            if (highlightIndex === null) {
                newIndex = (modifier > 0) ? 0 : length - 1;
            } else {
                newIndex = highlightIndex + modifier;
                if (newIndex < 0 || newIndex >= length) {
                    newIndex = null;
                }
            }
            this.set('highlightIndex', newIndex);
        }
    },

    // Typeahead functions
    initTypeahead: function () {
        var tags = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.whitespace,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: this.get('unassignedTags').map(function (tag) {
                return tag.get('name');
            })
        });

        this.$('#tag-input').typeahead({
            minLength: 1,
            classNames: {
                // TODO: Fix CSS for these
                input: 'tag-input',
                hint: 'tag-input',
                menu: 'dropdown-menu',
                suggestion: 'dropdown-item',
                open: 'open'
            }
        }, {
            name: 'tags',
            source: tags
        }).bind('typeahead:select', Ember.run.bind(this, 'typeaheadAdd'));
    },

    destroyTypeahead: function () {
        this.$('#tag-input').typeahead('destroy');
    },

    reloadTypeahead: function (refocus) {
        refocus = (typeof refocus !== 'undefined') ? refocus : true; // set default refocus value
        this.set('isReloading', true);
        this.destroyTypeahead();
        this.initTypeahead();
        if (refocus) {
            this.click();
        }
        this.set('isReloading', false);
    },

    // Tag Saving / Tag Add/Delete Actions
    saveTags: function () {
        var post = this.get('post');

        if (post && this.get('isDirty') && !this.get('isReloading')) {
            post.get('tags').clear();
            post.get('tags').pushObjects(this.get('currentTags').toArray());
            this.set('isDirty', false);
        }
    },

    // Used for typeahead selection
    typeaheadAdd: function (event, datum) {
        if (datum) {
            // this is needed so two tags with the same name aren't added
            this.$('#tag-input').typeahead('val', '');
            this.send('addTag', datum);
        }
    },

    actions: {
        addTag: function (tagName) {
            var tagToAdd, checkTag;

            this.$('#tag-input').typeahead('val', '');

            // Prevent multiple tags with the same name occuring
            if (this.get('currentTags').findBy('name', tagName)) {
                return;
            }

            checkTag = this.get('unassignedTags').findBy('name', tagName);

            if (checkTag) {
                tagToAdd = checkTag;
                this.get('unassignedTags').removeObject(checkTag);
                this.reloadTypeahead();
            } else {
                tagToAdd = this.get('store').createRecord('tag', {name: tagName});
            }

            this.set('isDirty', true);
            this.set('highlightIndex', null);
            this.get('currentTags').pushObject(tagToAdd);
        },

        deleteTag: function (tag) {
            var removedTag;

            if (tag) {
                removedTag = this.get('currentTags').findBy('name', tag);
                this.get('currentTags').removeObject(removedTag);
            } else {
                if (this.get('highlightIndex') !== null) {
                    removedTag = this.get('currentTags').objectAt(this.get('highlightIndex'));
                    this.get('currentTags').removeObject(removedTag);
                    this.set('highlightIndex', null);
                } else {
                    this.set('highlightIndex', this.get('currentTags.length') - 1);
                }
            }

            if (removedTag) {
                if (removedTag.get('isNew')) { // if tag is new, don't change isDirty,
                    removedTag.deleteRecord(); // and delete the new record
                } else {
                    this.set('isDirty', true);
                    this.get('unassignedTags').pushObject(removedTag);
                    this.reloadTypeahead();
                }
            }
        }
    }
});
