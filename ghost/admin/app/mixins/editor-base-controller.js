import Ember from 'ember';
import Mixin from 'ember-metal/mixin';
import RSVP from 'rsvp';
import computed, {alias} from 'ember-computed';
import injectService from 'ember-service/inject';
import injectController from 'ember-controller/inject';
import {htmlSafe} from 'ember-string';
import observer from 'ember-metal/observer';
import run from 'ember-runloop';
import {isEmberArray} from 'ember-array/utils';

import PostModel from 'ghost-admin/models/post';
import boundOneWay from 'ghost-admin/utils/bound-one-way';

const {resolve} = RSVP;

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

    postSettingsMenuController: injectController('post-settings-menu'),
    notifications: injectService(),
    clock: injectService(),

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
    willSchedule: boundOneWay('model.isScheduled'),
    scheduledWillPublish: boundOneWay('model.isPublished'),

    // set by the editor route and `hasDirtyAttributes`. useful when checking
    // whether the number of tags has changed for `hasDirtyAttributes`.
    previousTagNames: null,

    tagNames: computed('model.tags.@each.name', function () {
        return this.get('model.tags').mapBy('name');
    }),

    postOrPage: computed('model.page', function () {
        return this.get('model.page') ? 'Page' : 'Post';
    }),

    // countdown timer to show the time left until publish time for a scheduled post
    // starts 15 minutes before scheduled time
    scheduleCountdown: computed('model.status', 'clock.second', 'model.publishedAtUTC', 'model.timeScheduled', function () {
        let status = this.get('model.status');
        let publishTime = this.get('model.publishedAtUTC');

        this.get('clock.second');

        if (this.get('model.timeScheduled') && status === 'scheduled' && publishTime.diff(moment.utc(new Date()), 'minutes', true) < 15) {
            return moment(publishTime).fromNow();
        } else {
            return false;
        }
    }),

    // statusFreeze has two tasks:
    // 1. 2 minutes before the scheduled time it will return true to change the button layout in gh-editor-save-button. There will be no
    //    dropdown menu, the save button gets the status 'isDangerous' to turn red and will only have the option to unschedule the post
    // 2. when the scheduled time is reached we use a helper 'scheduledWillPublish' to pretend we're already dealing with a published post.
    //    This will take effect on the save button menu, the workflows and existing conditionals.
    statusFreeze: computed('model.status', 'clock.second', 'model.publishedAtUTC', 'model.timeScheduled', function () {
        let status = this.get('model.status');
        let publishTime = this.get('model.publishedAtUTC');

        this.get('clock.second');

        if (this.get('model.timeScheduled') && status === 'scheduled' && publishTime.diff(moment.utc(new Date()), 'minutes', true) < 2) {
            return true;
        } else if (!this.get('model.timeScheduled') && !this.get('scheduledWillPublish') && status === 'scheduled' && publishTime.diff(moment.utc(new Date()), 'hours', true) < 0) {
            // set the helper to true, until the model refreshed
            this.set('scheduledWillPublish', true);
            this.showSaveNotification('scheduled', 'published', false);
            return false;
        } else {
            return false;
        }
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

            if (!model) {
                return false;
            }

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
                    published: 'Update failed',
                    draft: 'Saving failed',
                    scheduled: 'Scheduling failed'
                },
                draft: {
                    published: 'Publish failed',
                    draft: 'Saving failed',
                    scheduled: 'Scheduling failed'
                },
                scheduled: {
                    scheduled: 'Updated failed',
                    draft: 'Unscheduling failed',
                    published: 'Publish failed'
                }

            }
        },

        success: {
            post: {
                published: {
                    published: 'Updated.',
                    draft: 'Saved.',
                    scheduled: 'Scheduled.'
                },
                draft: {
                    published: 'Published!',
                    draft: 'Saved.',
                    scheduled: 'Scheduled.'
                },
                scheduled: {
                    scheduled: 'Updated.',
                    draft: 'Unscheduled.',
                    published: 'Published!'
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

    showErrorAlert(prevStatus, status, error, delay) {
        let message = this.messageMap.errors.post[prevStatus][status];
        let notifications = this.get('notifications');
        let errorMessage;

        function isString(str) {
            /*global toString*/
            return toString.call(str) === '[object String]';
        }

        if (error && isString(error)) {
            errorMessage = error;
        } else if (error && isEmberArray(error)) {
            // This is here because validation errors are returned as an array
            // TODO: remove this once validations are fixed
            errorMessage = error[0];
        } else if (error && error.errors && error.errors[0].message) {
            errorMessage = error.errors[0].message;
        } else {
            errorMessage = 'Unknown Error';
        }

        message += `: ${errorMessage}`;
        message = htmlSafe(message);

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
                if (this.get('scheduledWillPublish')) {
                    status = (!this.get('willSchedule') && !this.get('willPublish')) ? 'draft' : 'published';
                } else {
                    if (this.get('willPublish') && !this.get('model.isScheduled') && !this.get('statusFreeze')) {
                        status = 'published';
                    } else if (this.get('willSchedule') && !this.get('model.isPublished') && !this.get('statusFreeze')) {
                        status = 'scheduled';
                    } else {
                        status = 'draft';
                    }
                }
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

                    // reset the helper CP back to false after saving and refetching the new model
                    // which is published by the scheduler process on the server now
                    if (this.get('scheduledWillPublish')) {
                        this.set('scheduledWillPublish', false);
                    }
                    return model;
                });
            }).catch((error) => {
                // re-throw if we have a general server error
                // TODO: use isValidationError(error) once we have
                // ember-ajax/ember-data integration
                if (error && error.errors && error.errors[0].errorType !== 'ValidationError') {
                    this.toggleProperty('submitting');
                    this.send('error', error);
                    return;
                }

                if (!options.silent) {
                    error = error || this.get('model.errors.messages');
                    this.showErrorAlert(prevStatus, this.get('model.status'), error);
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
                this.set('willSchedule', false);
            } else if (newType === 'draft') {
                this.set('willPublish', false);
                this.set('willSchedule', false);
            } else if (newType === 'schedule') {
                this.set('willSchedule', true);
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

        updateTitle() {
            let currentTitle = this.model.get('title');
            let newTitle = this.model.get('titleScratch').trim();

            if (currentTitle === newTitle) {
                return;
            }

            if (this.get('model.isDraft') && !this.get('model.isNew')) {
                // this is preferrable to setting hasDirtyAttributes to false manually
                this.model.set('title', newTitle);

                this.send('save', {
                    silent: true,
                    backgroundSave: true
                });
            }
        },

        toggleReAuthenticateModal() {
            this.toggleProperty('showReAuthenticateModal');
        }
    }
});
