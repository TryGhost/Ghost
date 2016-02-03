import Ember from 'ember';
import PostModel from 'ghost/models/post';
import boundOneWay from 'ghost/utils/bound-one-way';

const {
    Mixin,
    RSVP: {resolve},
    computed,
    inject: {service, controller},
    observer,
    run
} = Ember;
const {alias} = computed;

// this array will hold properties we need to watch
// to know if the model has been changed (`controller.hasDirtyAttributes`)
const watchedProps = ['model.scratch', 'model.titleScratch', 'model.hasDirtyAttributes', 'model.tags.[]'];

PostModel.eachAttribute(function (name) {
    watchedProps.push(`model.${name}`);
});

export default Mixin.create({
    _autoSaveId: null,
    _timedSaveId: null,
    submitting: false,

    showLeaveEditorModal: false,
    showReAuthenticateModal: false,

    postSettingsMenuController: controller('post-settings-menu'),
    notifications: service(),

    init() {
        this._super(...arguments);
        window.onbeforeunload = () => {
            return this.get('hasDirtyAttributes') ? this.unloadDirtyMessage() : null;
        };
    },

    shouldFocusTitle: alias('model.isNew'),
    shouldFocusEditor: false,

    autoSave: observer('model.scratch', function () {
        // Don't save just because we swapped out models
        if (this.get('model.isDraft') && !this.get('model.isNew')) {
            let autoSaveId,
                saveOptions,
                timedSaveId;

            saveOptions = {
                silent: true,
                backgroundSave: true
            };

            timedSaveId = run.throttle(this, 'send', 'save', saveOptions, 60000, false);
            this._timedSaveId = timedSaveId;

            autoSaveId = run.debounce(this, 'send', 'save', saveOptions, 3000);
            this._autoSaveId = autoSaveId;
        }
    }),

    /**
     * By default, a post will not change its publish state.
     * Only with a user-set value (via setSaveType action)
     * can the post's status change.
     */
    willPublish: boundOneWay('model.isPublished'),

    // set by the editor route and `hasDirtyAttributes`. useful when checking
    // whether the number of tags has changed for `hasDirtyAttributes`.
    previousTagNames: null,

    tagNames: computed('model.tags.@each.name', function () {
        return this.get('model.tags').mapBy('name');
    }),

    postOrPage: computed('model.page', function () {
        return this.get('model.page') ? 'Page' : 'Post';
    }),

    // compares previousTagNames to tagNames
    tagNamesEqual() {
        let tagNames = this.get('tagNames');
        let previousTagNames = this.get('previousTagNames');
        let hashCurrent,
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
    modelSaved() {
        let model = this.get('model');

        // safer to updateTags on save in one place
        // rather than in all other places save is called
        model.updateTags();

        // set previousTagNames to current tagNames for hasDirtyAttributes check
        this.set('previousTagNames', this.get('tagNames'));

        // `updateTags` triggers `hasDirtyAttributes => true`.
        // for a saved model it would otherwise be false.

        // if the two "scratch" properties (title and content) match the model, then
        // it's ok to set hasDirtyAttributes to false
        if (model.get('titleScratch') === model.get('title') &&
            model.get('scratch') === model.get('markdown')) {
            this.set('hasDirtyAttributes', false);
        }
    },

    // an ugly hack, but necessary to watch all the model's properties
    // and more, without having to be explicit and do it manually
    hasDirtyAttributes: computed.apply(Ember, watchedProps.concat({
        get() {
            let model = this.get('model');
            let markdown = model.get('markdown');
            let title = model.get('title');
            let titleScratch = model.get('titleScratch');
            let scratch = this.get('model.scratch');
            let changedAttributes;

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

            // models created on the client always return `hasDirtyAttributes: true`,
            // so we need to see which properties have actually changed.
            if (model.get('isNew')) {
                changedAttributes = Object.keys(model.changedAttributes());

                if (changedAttributes.length) {
                    return true;
                }

                return false;
            }

            // even though we use the `scratch` prop to show edits,
            // which does *not* change the model's `hasDirtyAttributes` property,
            // `hasDirtyAttributes` will tell us if the other props have changed,
            // as long as the model is not new (model.isNew === false).
            return model.get('hasDirtyAttributes');
        },
        set(key, value) {
            return value;
        }
    })),

    // used on window.onbeforeunload
    unloadDirtyMessage() {
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
    showSaveNotification(prevStatus, status, delay) {
        let message = this.messageMap.success.post[prevStatus][status];
        let notifications = this.get('notifications');
        let type, path;

        if (status === 'published') {
            type = this.get('postOrPage');
            path = this.get('model.absoluteUrl');
        } else {
            type = 'Preview';
            path = this.get('model.previewUrl');
        }

        message += `&nbsp;<a href="${path}" target="_blank">View ${type}</a>`;

        notifications.showNotification(message.htmlSafe(), {delayed: delay});
    },

    showErrorAlert(prevStatus, status, errors, delay) {
        let message = this.messageMap.errors.post[prevStatus][status];
        let notifications = this.get('notifications');
        let error;

        function isString(str) {
            /*global toString*/
            return toString.call(str) === '[object String]';
        }

        if (errors && isString(errors)) {
            error = errors;
        } else if (errors && errors[0] && isString(errors[0])) {
            error = errors[0];
        } else if (errors && errors[0] && errors[0].message && isString(errors[0].message)) {
            error = errors[0].message;
        } else {
            error = 'Unknown Error';
        }

        message += `<br />${error}`;
        message = Ember.String.htmlSafe(message);

        notifications.showAlert(message, {type: 'error', delayed: delay, key: 'post.save'});
    },

    actions: {
        cancelTimers() {
            let autoSaveId = this._autoSaveId;
            let timedSaveId = this._timedSaveId;

            if (autoSaveId) {
                run.cancel(autoSaveId);
                this._autoSaveId = null;
            }

            if (timedSaveId) {
                run.cancel(timedSaveId);
                this._timedSaveId = null;
            }
        },

        save(options) {
            let prevStatus = this.get('model.status');
            let isNew = this.get('model.isNew');
            let psmController = this.get('postSettingsMenuController');
            let promise, status;

            options = options || {};

            this.toggleProperty('submitting');

            if (options.backgroundSave) {
                // do not allow a post's status to be set to published by a background save
                status = 'draft';
            } else {
                status = this.get('willPublish') ? 'published' : 'draft';
            }

            this.send('cancelTimers');

            // Set the properties that are indirected
            // set markdown equal to what's in the editor, minus the image markers.
            this.set('model.markdown', this.get('model.scratch'));
            this.set('model.status', status);

            // Set a default title
            if (!this.get('model.titleScratch').trim()) {
                this.set('model.titleScratch', '(Untitled)');
            }

            this.set('model.title', this.get('model.titleScratch'));
            this.set('model.metaTitle', psmController.get('metaTitleScratch'));
            this.set('model.metaDescription', psmController.get('metaDescriptionScratch'));

            if (!this.get('model.slug')) {
                // Cancel any pending slug generation that may still be queued in the
                // run loop because we need to run it before the post is saved.
                run.cancel(psmController.get('debounceId'));

                psmController.generateAndSetSlug('model.slug');
            }

            promise = resolve(psmController.get('lastPromise')).then(() => {
                return this.get('model').save(options).then((model) => {
                    if (!options.silent) {
                        this.showSaveNotification(prevStatus, model.get('status'), isNew ? true : false);
                    }

                    this.toggleProperty('submitting');
                    return model;
                });
            }).catch((errors) => {
                if (!options.silent) {
                    errors = errors || this.get('model.errors.messages');
                    this.showErrorAlert(prevStatus, this.get('model.status'), errors);
                }

                this.set('model.status', prevStatus);

                this.toggleProperty('submitting');
                return this.get('model');
            });

            psmController.set('lastPromise', promise);

            return promise;
        },

        setSaveType(newType) {
            if (newType === 'publish') {
                this.set('willPublish', true);
            } else if (newType === 'draft') {
                this.set('willPublish', false);
            }
        },

        autoSaveNew() {
            if (this.get('model.isNew')) {
                this.send('save', {silent: true, backgroundSave: true});
            }
        },

        toggleLeaveEditorModal(transition) {
            this.set('leaveEditorTransition', transition);
            this.toggleProperty('showLeaveEditorModal');
        },

        leaveEditor() {
            let transition = this.get('leaveEditorTransition');
            let model = this.get('model');

            if (!transition) {
                this.get('notifications').showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // definitely want to clear the data store and post of any unsaved, client-generated tags
            model.updateTags();

            if (model.get('isNew')) {
                // the user doesn't want to save the new, unsaved post, so delete it.
                model.deleteRecord();
            } else {
                // roll back changes on model props
                model.rollbackAttributes();
            }

            // setting hasDirtyAttributes to false here allows willTransition on the editor route to succeed
            this.set('hasDirtyAttributes', false);

            // since the transition is now certain to complete, we can unset window.onbeforeunload here
            window.onbeforeunload = null;

            return transition.retry();
        },

        toggleReAuthenticateModal() {
            this.toggleProperty('showReAuthenticateModal');
        }
    }
});
