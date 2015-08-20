import Ember from 'ember';
import PostModel from 'ghost/models/post';
import boundOneWay from 'ghost/utils/bound-one-way';
import imageManager from 'ghost/utils/ed-image-manager';

// this array will hold properties we need to watch
// to know if the model has been changed (`controller.isDirty`)
var watchedProps = ['model.scratch', 'model.titleScratch', 'model.isDirty', 'model.tags.[]'];

PostModel.eachAttribute(function (name) {
    watchedProps.push('model.' + name);
});

export default Ember.Mixin.create({
    postSettingsMenuController: Ember.inject.controller('post-settings-menu'),

    autoSaveId: null,
    timedSaveId: null,
    editor: null,
    submitting: false,

    notifications: Ember.inject.service(),

    init: function () {
        var self = this;

        this._super();

        window.onbeforeunload = function () {
            return self.get('isDirty') ? self.unloadDirtyMessage() : null;
        };
    },

    shouldFocusTitle: Ember.computed.alias('model.isNew'),
    shouldFocusEditor: false,

    autoSave: Ember.observer('model.scratch', function () {
        // Don't save just because we swapped out models
        if (this.get('model.isDraft') && !this.get('model.isNew')) {
            var autoSaveId,
                timedSaveId,
                saveOptions;

            saveOptions = {
                silent: true,
                backgroundSave: true
            };

            timedSaveId = Ember.run.throttle(this, 'send', 'save', saveOptions, 60000, false);
            this.set('timedSaveId', timedSaveId);

            autoSaveId = Ember.run.debounce(this, 'send', 'save', saveOptions, 3000);
            this.set('autoSaveId', autoSaveId);
        }
    }),

    /**
     * By default, a post will not change its publish state.
     * Only with a user-set value (via setSaveType action)
     * can the post's status change.
     */
    willPublish: boundOneWay('model.isPublished'),

    // set by the editor route and `isDirty`. useful when checking
    // whether the number of tags has changed for `isDirty`.
    previousTagNames: null,

    tagNames: Ember.computed('model.tags.@each.name', function () {
        return this.get('model.tags').mapBy('name');
    }),

    postOrPage: Ember.computed('model.page', function () {
        return this.get('model.page') ? 'Page' : 'Post';
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
        if (model.get('titleScratch') === model.get('title') &&
            model.get('scratch') === model.get('markdown')) {
            this.set('isDirty', false);
        }
    },

    // an ugly hack, but necessary to watch all the model's properties
    // and more, without having to be explicit and do it manually
    isDirty: Ember.computed.apply(Ember, watchedProps.concat({
        get: function () {
            var model = this.get('model'),
                markdown = model.get('markdown'),
                title = model.get('title'),
                titleScratch = model.get('titleScratch'),
                scratch = this.get('editor').getValue(),
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

            // if the Adapter failed to save the model isError will be true
            // and we should consider the model still dirty.
            if (model.get('isError')) {
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
        },
        set: function (key, value) {
            return value;
        }
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

    // TODO: Update for new notification click-action API
    showSaveNotification: function (prevStatus, status, delay) {
        var message = this.messageMap.success.post[prevStatus][status],
            path = this.get('model.absoluteUrl'),
            type = this.get('postOrPage'),
            notifications = this.get('notifications');

        if (status === 'published') {
            message += `&nbsp;<a href="${path}">View ${type}</a>`;
        }

        notifications.showNotification(message.htmlSafe(), {delayed: delay});
    },

    showErrorNotification: function (prevStatus, status, errors, delay) {
        var message = this.messageMap.errors.post[prevStatus][status],
            error = (errors && errors[0] && errors[0].message) || 'Unknown Error',
            notifications = this.get('notifications');

        message += '<br />' + error;

        notifications.showAlert(message.htmlSafe(), {type: 'error', delayed: delay});
    },

    actions: {
        save: function (options) {
            var status,
                prevStatus = this.get('model.status'),
                isNew = this.get('model.isNew'),
                autoSaveId = this.get('autoSaveId'),
                timedSaveId = this.get('timedSaveId'),
                self = this,
                psmController = this.get('postSettingsMenuController'),
                promise,
                notifications = this.get('notifications');

            options = options || {};

            // when navigating quickly between pages autoSave will occasionally
            // try to run after the editor has been torn down so bail out here
            // before we throw errors
            if (!this.get('editor').$()) {
                return 0;
            }

            this.toggleProperty('submitting');

            if (options.backgroundSave) {
                // do not allow a post's status to be set to published by a background save
                status = 'draft';
            } else {
                status = this.get('willPublish') ? 'published' : 'draft';
            }

            if (autoSaveId) {
                Ember.run.cancel(autoSaveId);
                this.set('autoSaveId', null);
            }

            if (timedSaveId) {
                Ember.run.cancel(timedSaveId);
                this.set('timedSaveId', null);
            }

            notifications.closeNotifications();

            // Set the properties that are indirected
            // set markdown equal to what's in the editor, minus the image markers.
            this.set('model.markdown', this.get('editor').getValue());
            this.set('model.status', status);

            // Set a default title
            if (!this.get('model.titleScratch').trim()) {
                this.set('model.titleScratch', '(Untitled)');
            }

            this.set('model.title', this.get('model.titleScratch'));
            this.set('model.meta_title', psmController.get('metaTitleScratch'));
            this.set('model.meta_description', psmController.get('metaDescriptionScratch'));

            if (!this.get('model.slug')) {
                // Cancel any pending slug generation that may still be queued in the
                // run loop because we need to run it before the post is saved.
                Ember.run.cancel(psmController.get('debounceId'));

                psmController.generateAndSetSlug('model.slug');
            }

            promise = Ember.RSVP.resolve(psmController.get('lastPromise')).then(function () {
                return self.get('model').save(options).then(function (model) {
                    if (!options.silent) {
                        self.showSaveNotification(prevStatus, model.get('status'), isNew ? true : false);
                    }

                    self.toggleProperty('submitting');
                    return model;
                });
            }).catch(function (errors) {
                if (!options.silent) {
                    self.showErrorNotification(prevStatus, self.get('model.status'), errors);
                }

                self.set('model.status', prevStatus);

                self.toggleProperty('submitting');
                return self.get('model');
            });

            psmController.set('lastPromise', promise);

            return promise;
        },

        setSaveType: function (newType) {
            if (newType === 'publish') {
                this.set('willPublish', true);
            } else if (newType === 'draft') {
                this.set('willPublish', false);
            }
        },

        // set from a `sendAction` on the gh-ed-editor component,
        // so that we get a reference for handling uploads.
        setEditor: function (editor) {
            this.set('editor', editor);
        },

        // fired from the gh-ed-preview component when an image upload starts
        disableEditor: function () {
            this.get('editor').disable();
        },

        // fired from the gh-ed-preview component when an image upload finishes
        enableEditor: function () {
            this.get('editor').enable();
        },

        // Match the uploaded file to a line in the editor, and update that line with a path reference
        // ensuring that everything ends up in the correct place and format.
        handleImgUpload: function (e, resultSrc) {
            var editor = this.get('editor'),
                editorValue = editor.getValue(),
                replacement = imageManager.getSrcRange(editorValue, e.target),
                cursorPosition;

            if (replacement) {
                cursorPosition = replacement.start + resultSrc.length + 1;
                if (replacement.needsParens) {
                    resultSrc = '(' + resultSrc + ')';
                }
                editor.replaceSelection(resultSrc, replacement.start, replacement.end, cursorPosition);
            }
        },

        autoSaveNew: function () {
            if (this.get('model.isNew')) {
                this.send('save', {silent: true, backgroundSave: true});
            }
        },

        updateEditorScrollInfo: function (scrollInfo) {
            this.set('editorScrollInfo', scrollInfo);
        },

        updateHeight: function (height) {
            this.set('height', height);
        }
    }
});
