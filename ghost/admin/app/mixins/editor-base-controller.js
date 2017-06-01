import Ember from 'ember';
import Mixin from 'ember-metal/mixin';
import PostModel from 'ghost-admin/models/post';
import RSVP from 'rsvp';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import computed, {alias, mapBy, reads} from 'ember-computed';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import injectController from 'ember-controller/inject';
import injectService from 'ember-service/inject';
import moment from 'moment';
import {htmlSafe} from 'ember-string';
import {isBlank} from 'ember-utils';
import {isEmberArray} from 'ember-array/utils';
import {isInvalidError} from 'ember-ajax/errors';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {task, timeout} from 'ember-concurrency';

const {resolve} = RSVP;

// ember-cli-shims doesn't export Ember.testing
const {testing} = Ember;

// this array will hold properties we need to watch
// to know if the model has been changed (`controller.hasDirtyAttributes`)
const watchedProps = ['model.scratch', 'model.titleScratch', 'model.hasDirtyAttributes', 'model.tags.[]'];

const TITLE_DEBOUNCE = testing ? 10 : 700;

PostModel.eachAttribute(function (name) {
    watchedProps.push(`model.${name}`);
});

export default Mixin.create({

    showLeaveEditorModal: false,
    showReAuthenticateModal: false,
    showDeletePostModal: false,

    application: injectController(),
    notifications: injectService(),
    clock: injectService(),
    slugGenerator: injectService(),

    wordcount: 0,
    cards: [], // for apps
    atoms: [], // for apps
    toolbar: [], // for apps
    apiRoot: ghostPaths().apiRoot,
    assetPath: ghostPaths().assetRoot,
    editor: null,
    editorMenuIsOpen: false,

    shouldFocusTitle: alias('model.isNew'),
    shouldFocusEditor: false,

    navIsClosed: reads('application.autoNav'),

    init() {
        this._super(...arguments);
        window.onbeforeunload = () => {
            return this.get('hasDirtyAttributes') ? this.unloadDirtyMessage() : null;
        };
    },

    _canAutosave: computed('model.{isDraft,isNew}', function () {
        return !testing && this.get('model.isDraft') && !this.get('model.isNew');
    }),

    // save 3 seconds after the last edit
    _autosave: task(function* () {
        yield timeout(3000);

        if (this.get('_canAutosave')) {
            yield this.get('autosave').perform();
        }
    }).restartable(),

    // save at 60 seconds even if the user doesn't stop typing
    _timedSave: task(function* () {
        // eslint-disable-next-line no-constant-condition
        while (!testing && true) {
            yield timeout(60000);

            if (this.get('_canAutosave')) {
                yield this.get('autosave').perform();
            }
        }
    }).drop(),

    // separate task for autosave so that it doesn't override a manual save
    autosave: task(function* () {
        if (!this.get('save.isRunning')) {
            return yield this._savePromise({
                silent: true,
                backgroundSave: true
            });
        }
    }).drop(),

    // save tasks cancels autosave before running, although this cancels the
    // _xSave tasks  that will also cancel the autosave task
    save: task(function* (options) {
        this.send('cancelAutosave');
        return yield this._savePromise(options);
    }),

    // TODO: convert this into a more ember-concurrency flavour
    _savePromise(options) {
        let prevStatus = this.get('model.status');
        let isNew = this.get('model.isNew');
        let promise, status;

        options = options || {};

        if (options.backgroundSave && !this.get('hasDirtyAttributes')) {
            return RSVP.resolve();
        }

        if (options.backgroundSave) {
            // do not allow a post's status to be set to published by a background save
            status = 'draft';
        } else {
            if (this.get('post.pastScheduledTime')) {
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

        // Set the properties that are indirected
        // set mobiledoc equal to what's in the editor, minus the image markers.
        this.set('model.mobiledoc', this.get('model.scratch'));
        this.set('model.status', status);

        // Set a default title
        if (!this.get('model.titleScratch').trim()) {
            this.set('model.titleScratch', '(Untitled)');
        }

        this.set('model.title', this.get('model.titleScratch'));
        this.set('model.metaTitle', this.get('model.metaTitleScratch'));
        this.set('model.metaDescription', this.get('model.metaDescriptionScratch'));

        if (!this.get('model.slug')) {
            this.get('updateTitle').cancelAll();

            promise = this.get('generateSlug').perform();
        }

        return resolve(promise).then(() => {
            return this.get('model').save(options).then((model) => {
                if (!options.silent) {
                    this.showSaveNotification(prevStatus, model.get('status'), isNew ? true : false);
                }

                this.get('model').set('statusScratch', null);

                return model;
            });

        }).catch((error) => {
            // re-throw if we have a general server error
            if (error && !isInvalidError(error)) {
                this.send('error', error);
                return;
            }

            this.set('model.status', prevStatus);

            if (!options.silent) {
                error = error || this.get('model.errors.messages');
                this.showErrorAlert(prevStatus, this.get('model.status'), error);
                // simulate a validation error for upstream tasks
                throw undefined;
            }

            return this.get('model');
        });
    },

    /**
     * By default, a post will not change its publish state.
     * Only with a user-set value (via setSaveType action)
     * can the post's status change.
     */
    willPublish: boundOneWay('model.isPublished'),
    willSchedule: boundOneWay('model.isScheduled'),

    // set by the editor route and `hasDirtyAttributes`. useful when checking
    // whether the number of tags has changed for `hasDirtyAttributes`.
    previousTagNames: null,

    tagNames: mapBy('model.tags', 'name'),

    postOrPage: computed('model.page', function () {
        return this.get('model.page') ? 'Page' : 'Post';
    }),

    // countdown timer to show the time left until publish time for a scheduled post
    // starts 15 minutes before scheduled time
    scheduleCountdown: computed('model.{publishedAtUTC,isScheduled}', 'clock.second', function () {
        let isScheduled = this.get('model.isScheduled');
        let publishTime = this.get('model.publishedAtUTC') || moment.utc();
        let timeUntilPublished = publishTime.diff(moment.utc(), 'minutes', true);
        let isPublishedSoon = timeUntilPublished > 0 && timeUntilPublished < 15;

        // force a recompute
        this.get('clock.second');

        if (isScheduled && isPublishedSoon) {
            return moment(publishTime).fromNow();
        } else {
            return false;
        }
    }),

    // compares previousTagNames to tagNames
    tagNamesEqual() {
        let tagNames = this.get('tagNames') || [];
        let previousTagNames = this.get('previousTagNames') || [];
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
        if (model.get('titleScratch') === model.get('title')
            && JSON.stringify(model.get('scratch')) === JSON.stringify(model.get('mobiledoc'))) {
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

            let mobiledoc = JSON.stringify(model.get('mobiledoc'));
            let scratch = JSON.stringify(model.get('scratch'));
            let title = model.get('title');
            let titleScratch = model.get('titleScratch');
            let changedAttributes;

            if (!this.tagNamesEqual()) {
                return true;
            }

            if (titleScratch !== title) {
                return true;
            }

            // since `scratch` is not model property, we need to check
            // it explicitly against the model's mobiledoc attribute
            if (mobiledoc !== scratch) {
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
        return '==============================\n\n'
             + 'Hey there! It looks like you\'re in the middle of writing'
             + ' something and you haven\'t saved all of your content.'
             + '\n\nSave before you go!\n\n'
             + '==============================';
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
            /* global toString */
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

    updateTitle: task(function* (newTitle) {
        let model = this.get('model');

        model.set('titleScratch', newTitle);

        // if model is not new and title is not '(Untitled)', or model is new and
        // has a title, don't generate a slug
        if ((!model.get('isNew') || model.get('title')) && newTitle !== '(Untitled)') {
            return;
        }

        // debounce for 700 milliseconds
        yield timeout(TITLE_DEBOUNCE);

        yield this.get('generateSlug').perform();
    }).restartable(),

    generateSlug: task(function* () {
        let title = this.get('model.titleScratch');

        // Only set an "untitled" slug once per post
        if (title === '(Untitled)' && this.get('model.slug')) {
            return;
        }

        try {
            let slug = yield this.get('slugGenerator').generateSlug('post', title);

            if (!isBlank(slug)) {
                this.set('model.slug', slug);
            }
        } catch (error) {
            // Nothing to do (would be nice to log this somewhere though),
            // but a rejected promise needs to be handled here so that a resolved
            // promise is returned.
            if (isVersionMismatchError(error)) {
                this.get('notifications').showAPIError(error);
            }
        }
    }).enqueue(),

    actions: {
        updateScratch(value) {
            this.set('model.scratch', value);

            // save 3 seconds after last edit
            this.get('_autosave').perform();
            // force save at 60 seconds
            this.get('_timedSave').perform();
        },

        cancelAutosave() {
            this.get('_autosave').cancelAll();
            this.get('_timedSave').cancelAll();
        },

        save(options) {
            return this.get('save').perform(options);
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

        closeNavMenu() {
            this.get('application').send('closeAutoNav');
        },

        closeMenus() {
            this.get('application').send('closeMenus');
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

        saveTitle() {
            let currentTitle = this.get('model.title');
            let newTitle = this.get('model.titleScratch').trim();

            if (newTitle === currentTitle) {
                return;
            }

            if (this.get('model.isDraft')) {
                this.send('save', {
                    silent: true,
                    backgroundSave: true
                });
            }
        },

        toggleDeletePostModal() {
            if (!this.get('model.isNew')) {
                this.toggleProperty('showDeletePostModal');
            }
        },

        toggleReAuthenticateModal() {
            this.toggleProperty('showReAuthenticateModal');
        },

        setWordcount(wordcount) {
            this.set('wordcount', wordcount);
        },

        toggleAutoNav() {
            this.get('application').send('toggleAutoNav');
        }
    }
});
