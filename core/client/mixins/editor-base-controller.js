/* global console */
import MarkerManager from 'ghost/mixins/marker-manager';
import PostModel from 'ghost/models/post';
import boundOneWay from 'ghost/utils/bound-one-way';

var watchedProps,
    EditorControllerMixin;

// this array will hold properties we need to watch
// to know if the model has been changed (`controller.isDirty`)
watchedProps = ['scratch', 'titleScratch', 'model.isDirty', 'tags.[]'];

PostModel.eachAttribute(function (name) {
    watchedProps.push('model.' + name);
});

EditorControllerMixin = Ember.Mixin.create(MarkerManager, {
    needs: ['post-tags-input', 'post-settings-menu'],

    init: function () {
        var self = this;

        this._super();

        window.onbeforeunload = function () {
            return self.get('isDirty') ? self.unloadDirtyMessage() : null;
        };
    },

    /**
     * By default, a post will not change its publish state.
     * Only with a user-set value (via setSaveType action)
     * can the post's status change.
     */
    willPublish: boundOneWay('isPublished'),

    // Make sure editor starts with markdown shown
    isPreview: false,

    // set by the editor route and `isDirty`. useful when checking
    // whether the number of tags has changed for `isDirty`.
    previousTagNames: null,

    tagNames: Ember.computed('tags.@each.name', function () {
        return this.get('tags').mapBy('name');
    }),

    // compares previousTagNames to tagNames
    tagNamesEqual: function () {
        var tagNames = this.get('tagNames'),
            previousTagNames = this.get('previousTagNames'),
            hashCurrent,
            hashPrevious;

        // beware! even if they have the same length,
        // that doesn't mean they're the same.
        if (tagNames.length !== previousTagNames.length) {
            return false;
        }

        // instead of comparing with slow, nested for loops,
        // perform join on each array and compare the strings
        hashCurrent = tagNames.join('');
        hashPrevious = previousTagNames.join('');

        return hashCurrent === hashPrevious;
    },

    // a hook created in editor-base-route's setupController
    modelSaved: function () {
        var model = this.get('model');

        // safer to updateTags on save in one place
        // rather than in all other places save is called
        model.updateTags();

        // set previousTagNames to current tagNames for isDirty check
        this.set('previousTagNames', this.get('tagNames'));

        // `updateTags` triggers `isDirty => true`.
        // for a saved model it would otherwise be false.

        // if the two "scratch" properties (title and content) match the model, then
        // it's ok to set isDirty to false
        if (this.get('titleScratch') === model.get('title') &&
            this.get('scratch') === model.get('markdown')) {
            this.set('isDirty', false);
        }
    },

    // an ugly hack, but necessary to watch all the model's properties
    // and more, without having to be explicit and do it manually
    isDirty: Ember.computed.apply(Ember, watchedProps.concat(function (key, value) {
        if (arguments.length > 1) {
            return value;
        }

        var model = this.get('model'),
            markdown = this.get('markdown'),
            title = this.get('title'),
            titleScratch = this.get('titleScratch'),
            scratch = this.getMarkdown().withoutMarkers,
            changedAttributes;

        if (!this.tagNamesEqual()) {
            return true;
        }

        if (titleScratch !== title) {
            return true;
        }

        // since `scratch` is not model property, we need to check
        // it explicitly against the model's markdown attribute
        if (markdown !== scratch) {
            return true;
        }

        // models created on the client always return `isDirty: true`,
        // so we need to see which properties have actually changed.
        if (model.get('isNew')) {
            changedAttributes = Ember.keys(model.changedAttributes());

            if (changedAttributes.length) {
                return true;
            }

            return false;
        }

        // even though we use the `scratch` prop to show edits,
        // which does *not* change the model's `isDirty` property,
        // `isDirty` will tell us if the other props have changed,
        // as long as the model is not new (model.isNew === false).
        return model.get('isDirty');
    })),

    // used on window.onbeforeunload
    unloadDirtyMessage: function () {
        return '==============================\n\n' +
            'Hey there! It looks like you\'re in the middle of writing' +
            ' something and you haven\'t saved all of your content.' +
            '\n\nSave before you go!\n\n' +
            '==============================';
    },

    // TODO: This has to be moved to the I18n localization file.
    // This structure is supposed to be close to the i18n-localization which will be used soon.
    messageMap: {
        errors: {
            post: {
                published: {
                    published: 'Update failed.',
                    draft: 'Saving failed.'
                },
                draft: {
                    published: 'Publish failed.',
                    draft: 'Saving failed.'
                }

            }
        },

        success: {
            post: {
                published: {
                    published: 'Updated.',
                    draft: 'Saved.'
                },
                draft: {
                    published: 'Published!',
                    draft: 'Saved.'
                }
            }
        }
    },

    showSaveNotification: function (prevStatus, status, delay) {
        var message = this.messageMap.success.post[prevStatus][status];

        this.notifications.showSuccess(message, {delayed: delay});
    },

    showErrorNotification: function (prevStatus, status, errors, delay) {
        var message = this.messageMap.errors.post[prevStatus][status];

        message += '<br />' + errors[0].message;

        this.notifications.showError(message, {delayed: delay});
    },

    shouldFocusTitle: Ember.computed.alias('model.isNew'),
    shouldFocusEditor: Ember.computed.not('model.isNew'),

    actions: {
        save: function (options) {
            var status = this.get('willPublish') ? 'published' : 'draft',
                prevStatus = this.get('status'),
                isNew = this.get('isNew'),
                autoSaveId = this.get('autoSaveId'),
                timedSaveId = this.get('timedSaveId'),
                self = this,
                psmController = this.get('controllers.post-settings-menu'),
                promise;

            options = options || {};

            if (autoSaveId) {
                Ember.run.cancel(autoSaveId);
                this.set('autoSaveId', null);
            }

            if (timedSaveId) {
                Ember.run.cancel(timedSaveId);
                this.set('timedSaveId', null);
            }

            self.notifications.closePassive();

            // ensure an incomplete tag is finalised before save
            this.get('controllers.post-tags-input').send('addNewTag');

            // Set the properties that are indirected
            // set markdown equal to what's in the editor, minus the image markers.
            this.set('markdown', this.getMarkdown().withoutMarkers);
            this.set('status', status);

            // Set a default title
            if (!this.get('titleScratch')) {
                this.set('titleScratch', '(Untitled)');
            }

            this.set('title', this.get('titleScratch'));
            this.set('meta_title', psmController.get('metaTitleScratch'));
            this.set('meta_description', psmController.get('metaDescriptionScratch'));

            if (!this.get('slug')) {
                // Cancel any pending slug generation that may still be queued in the
                // run loop because we need to run it before the post is saved.
                Ember.run.cancel(psmController.get('debounceId'));

                psmController.generateAndSetSlug('slug');
            }

            promise = Ember.RSVP.resolve(psmController.get('lastPromise')).then(function () {
                return self.get('model').save(options).then(function (model) {
                    if (!options.silent) {
                        self.showSaveNotification(prevStatus, model.get('status'), isNew ? true : false);
                    }

                    return model;
                });
            }).catch(function (errors) {
                if (!options.silent) {
                    self.showErrorNotification(prevStatus, self.get('status'), errors);
                }

                self.set('status', prevStatus);

                return Ember.RSVP.reject(errors);
            });

            psmController.set('lastPromise', promise);

            return promise;
        },

        setSaveType: function (newType) {
            if (newType === 'publish') {
                this.set('willPublish', true);
            } else if (newType === 'draft') {
                this.set('willPublish', false);
            } else {
                console.warn('Received invalid save type; ignoring.');
            }
        },

        // set from a `sendAction` on the codemirror component,
        // so that we get a reference for handling uploads.
        setCodeMirror: function (codemirrorComponent) {
            var codemirror = codemirrorComponent.get('codemirror');

            this.set('codemirrorComponent', codemirrorComponent);
            this.set('codemirror', codemirror);
        },

        // fired from the gh-markdown component when an image upload starts
        disableCodeMirror: function () {
            this.get('codemirrorComponent').disableCodeMirror();
        },

        // fired from the gh-markdown component when an image upload finishes
        enableCodeMirror: function () {
            this.get('codemirrorComponent').enableCodeMirror();
        },

        // Match the uploaded file to a line in the editor, and update that line with a path reference
        // ensuring that everything ends up in the correct place and format.
        handleImgUpload: function (e, resultSrc) {
            var editor = this.get('codemirror'),
                line = this.findLine(Ember.$(e.currentTarget).attr('id')),
                lineNumber = editor.getLineNumber(line),
                // jscs:disable
                match = line.text.match(/\([^\n]*\)?/),
                // jscs:enable
                replacement = '(http://)';

            if (match) {
                // simple case, we have the parenthesis
                editor.setSelection(
                    {line: lineNumber, ch: match.index + 1},
                    {line: lineNumber, ch: match.index + match[0].length - 1}
                );
            } else {
                // jscs:disable
                match = line.text.match(/\]/);
                // jscs:enable
                if (match) {
                    editor.replaceRange(
                        replacement,
                        {line: lineNumber, ch: match.index + 1},
                        {line: lineNumber, ch: match.index + 1}
                    );
                    editor.setSelection(
                        {line: lineNumber, ch: match.index + 2},
                        {line: lineNumber, ch: match.index + replacement.length}
                    );
                }
            }

            editor.replaceSelection(resultSrc);
        },

        togglePreview: function (preview) {
            this.set('isPreview', preview);
        },

        autoSave: function () {
            if (this.get('model.isDraft')) {
                var autoSaveId,
                    timedSaveId;

                timedSaveId = Ember.run.throttle(this, 'send', 'save', {silent: true, disableNProgress: true}, 60000, false);
                this.set('timedSaveId', timedSaveId);

                autoSaveId = Ember.run.debounce(this, 'send', 'save', {silent: true, disableNProgress: true}, 3000);
                this.set('autoSaveId', autoSaveId);
            }
        },

        autoSaveNew: function () {
            if (this.get('isNew')) {
                this.send('save', {silent: true, disableNProgress: true});
            }
        }
    }
});

export default EditorControllerMixin;
