import Ember from 'ember';
import Mixin from '@ember/object/mixin';
import PostModel from 'ghost-admin/models/post';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import isNumber from 'ghost-admin/utils/isNumber';
import moment from 'moment';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as controller} from '@ember/controller';
import {htmlSafe} from '@ember/string';
import {isBlank} from '@ember/utils';
import {isArray as isEmberArray} from '@ember/array';
import {isInvalidError} from 'ember-ajax/errors';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {mapBy, reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task, taskGroup, timeout} from 'ember-concurrency';

// this array will hold properties we need to watch
// to know if the post has been changed (`controller.hasDirtyAttributes`)
const watchedProps = ['post.scratch', 'post.titleScratch', 'post.hasDirtyAttributes', 'post.tags.[]'];

const DEFAULT_TITLE = '(Untitled)';

// time in ms to save after last content edit
const AUTOSAVE_TIMEOUT = 3000;
// time in ms to force a save if the user is continuously typing
const TIMEDSAVE_TIMEOUT = 60000;

PostModel.eachAttribute(function (name) {
    watchedProps.push(`post.${name}`);
});

export default Mixin.create({

    post: alias('model'),

    showLeaveEditorModal: false,
    showReAuthenticateModal: false,
    showDeletePostModal: false,
    shouldFocusEditor: true,

    application: controller(),
    notifications: service(),
    clock: service(),
    slugGenerator: service(),
    ui: service(),

    wordcount: 0,
    cards: [], // for apps
    atoms: [], // for apps
    toolbar: [], // for apps
    apiRoot: ghostPaths().apiRoot,
    assetPath: ghostPaths().assetRoot,
    editor: null,
    editorMenuIsOpen: false,

    navIsClosed: reads('application.autoNav'),

    init() {
        this._super(...arguments);
        window.onbeforeunload = () => {
            if (this.get('hasDirtyAttributes')) {
                return this.unloadDirtyMessage();
            }
        };
    },

    _canAutosave: computed('post.isDraft', function () {
        return !Ember.testing && this.get('post.isDraft'); // eslint-disable-line
    }),

    // save 3 seconds after the last edit
    _autosave: task(function* () {
        if (!this.get('_canAutosave')) {
            return;
        }

        // force an instant save on first body edit for new posts
        if (this.get('post.isNew')) {
            return this.get('autosave').perform();
        }

        yield timeout(AUTOSAVE_TIMEOUT);
        this.get('autosave').perform();
    }).restartable(),

    // save at 60 seconds even if the user doesn't stop typing
    _timedSave: task(function* () {
        if (!this.get('_canAutosave')) {
            return;
        }

        while (!Ember.testing && true) { // eslint-disable-line
            yield timeout(TIMEDSAVE_TIMEOUT);
            this.get('autosave').perform();
        }
    }).drop(),

    // separate task for autosave so that it doesn't override a manual save
    autosave: task(function* () {
        if (!this.get('save.isRunning')) {
            return yield this.get('save').perform({
                silent: true,
                backgroundSave: true
            });
        }
    }).drop(),

    _autosaveRunning: computed('_autosave.isRunning', '_timedSave.isRunning', function () {
        let autosave = this.get('_autosave.isRunning');
        let timedsave = this.get('_timedSave.isRunning');

        return autosave || timedsave;
    }),

    // updateSlug and save should always be enqueued so that we don't run into
    // problems with concurrency, for example when Cmd-S is pressed whilst the
    // cursor is in the slug field - that would previously trigger a simultaneous
    // slug update and save resulting in ember data errors and inconsistent save
    // results
    saveTasks: taskGroup().enqueue(),

    // save tasks cancels autosave before running, although this cancels the
    // _xSave tasks  that will also cancel the autosave task
    save: task(function* (options = {}) {
        let prevStatus = this.get('post.status');
        let isNew = this.get('post.isNew');
        let status;

        this.send('cancelAutosave');

        if (options.backgroundSave && !this.get('hasDirtyAttributes')) {
            return;
        }

        if (options.backgroundSave) {
            // do not allow a post's status to be set to published by a background save
            status = 'draft';
        } else {
            if (this.get('post.pastScheduledTime')) {
                status = (!this.get('willSchedule') && !this.get('willPublish')) ? 'draft' : 'published';
            } else {
                if (this.get('willPublish') && !this.get('post.isScheduled') && !this.get('statusFreeze')) {
                    status = 'published';
                } else if (this.get('willSchedule') && !this.get('post.isPublished') && !this.get('statusFreeze')) {
                    status = 'scheduled';
                } else {
                    status = 'draft';
                }
            }
        }

        // Set the properties that are indirected
        // set mobiledoc equal to what's in the editor, minus the image markers.
        this.set('post.mobiledoc', this.get('post.scratch'));
        this.set('post.status', status);

        // Set a default title
        if (!this.get('post.titleScratch').trim()) {
            this.set('post.titleScratch', DEFAULT_TITLE);
        }

        this.set('post.title', this.get('post.titleScratch'));
        this.set('post.customExcerpt', this.get('post.customExcerptScratch'));
        this.set('post.footerInjection', this.get('post.footerExcerptScratch'));
        this.set('post.headerInjection', this.get('post.headerExcerptScratch'));
        this.set('post.metaTitle', this.get('post.metaTitleScratch'));
        this.set('post.metaDescription', this.get('post.metaDescriptionScratch'));
        this.set('post.ogTitle', this.get('post.ogTitleScratch'));
        this.set('post.ogDescription', this.get('post.ogDescriptionScratch'));
        this.set('post.twitterTitle', this.get('post.twitterTitleScratch'));
        this.set('post.twitterDescription', this.get('post.twitterDescriptionScratch'));

        if (!this.get('post.slug')) {
            this.get('saveTitle').cancelAll();

            yield this.get('generateSlug').perform();
        }

        try {
            let post = yield this.get('post').save(options);

            if (!options.silent) {
                this.showSaveNotification(prevStatus, post.get('status'), isNew ? true : false);
            }

            this.get('post').set('statusScratch', null);

            // redirect to edit route if saving a new record
            if (isNew && post.get('id')) {
                if (!this.get('leaveEditorTransition')) {
                    this.replaceRoute('editor.edit', post);
                }
                return true;
            }

            return post;
        } catch (error) {
            // re-throw if we have a general server error
            if (error && !isInvalidError(error)) {
                this.send('error', error);
                return;
            }

            this.set('post.status', prevStatus);

            if (!options.silent) {
                let errorOrMessages = error || this.get('post.errors.messages');
                this.showErrorAlert(prevStatus, this.get('post.status'), errorOrMessages);
                // simulate a validation error for upstream tasks
                throw undefined;
            }

            return this.get('post');
        }
    }).group('saveTasks'),

    /*
     * triggered by a user manually changing slug
     */
    updateSlug: task(function* (_newSlug) {
        let slug = this.get('post.slug');
        let newSlug, serverSlug;

        newSlug = _newSlug || slug;
        newSlug = newSlug && newSlug.trim();

        // Ignore unchanged slugs or candidate slugs that are empty
        if (!newSlug || slug === newSlug) {
            // reset the input to its previous state
            this.set('slugValue', slug);
            return;
        }

        serverSlug = yield this.get('slugGenerator').generateSlug('post', newSlug);

        // If after getting the sanitized and unique slug back from the API
        // we end up with a slug that matches the existing slug, abort the change
        if (serverSlug === slug) {
            return;
        }

        // Because the server transforms the candidate slug by stripping
        // certain characters and appending a number onto the end of slugs
        // to enforce uniqueness, there are cases where we can get back a
        // candidate slug that is a duplicate of the original except for
        // the trailing incrementor (e.g., this-is-a-slug and this-is-a-slug-2)

        // get the last token out of the slug candidate and see if it's a number
        let slugTokens = serverSlug.split('-');
        let check = Number(slugTokens.pop());

        // if the candidate slug is the same as the existing slug except
        // for the incrementor then the existing slug should be used
        if (isNumber(check) && check > 0) {
            if (slug === slugTokens.join('-') && serverSlug !== newSlug) {
                this.set('slugValue', slug);

                return;
            }
        }

        this.set('post.slug', serverSlug);

        // If this is a new post.  Don't save the post.  Defer the save
        // to the user pressing the save button
        if (this.get('post.isNew')) {
            return;
        }

        return yield this.get('post').save();
    }).group('saveTasks'),

    // used in the PSM so that saves are sequential and don't trigger collision
    // detection errors
    savePost: task(function* () {
        try {
            return yield this.get('post').save();
        } catch (error) {
            if (error) {
                let status = this.get('post.status');
                this.showErrorAlert(status, status, error);
            }

            throw error;
        }
    }).group('saveTasks'),

    /**
     * By default, a post will not change its publish state.
     * Only with a user-set value (via setSaveType action)
     * can the post's status change.
     */
    willPublish: boundOneWay('post.isPublished'),
    willSchedule: boundOneWay('post.isScheduled'),

    // set by the editor route and `hasDirtyAttributes`. useful when checking
    // whether the number of tags has changed for `hasDirtyAttributes`.
    previousTagNames: null,

    tagNames: mapBy('post.tags', 'name'),

    postOrPage: computed('post.page', function () {
        return this.get('post.page') ? 'Page' : 'Post';
    }),

    // countdown timer to show the time left until publish time for a scheduled post
    // starts 15 minutes before scheduled time
    scheduleCountdown: computed('post.{publishedAtUTC,isScheduled}', 'clock.second', function () {
        let isScheduled = this.get('post.isScheduled');
        let publishTime = this.get('post.publishedAtUTC') || moment.utc();
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
    postSaved() {
        let post = this.get('post');

        // safer to updateTags on save in one place
        // rather than in all other places save is called
        post.updateTags();

        // set previousTagNames to current tagNames for hasDirtyAttributes check
        this.set('previousTagNames', this.get('tagNames'));

        // `updateTags` triggers `hasDirtyAttributes => true`.
        // for a saved post it would otherwise be false.

        // if the two "scratch" properties (title and content) match the post, then
        // it's ok to set hasDirtyAttributes to false
        if (post.get('titleScratch') === post.get('title')
            && JSON.stringify(post.get('scratch')) === JSON.stringify(post.get('mobiledoc'))) {
            this.set('hasDirtyAttributes', false);
        }
    },

    // an ugly hack, but necessary to watch all the post's properties
    // and more, without having to be explicit and do it manually
    hasDirtyAttributes: computed.apply(Ember, watchedProps.concat({
        get() {
            let post = this.get('post');

            if (!post) {
                return false;
            }

            let mobiledoc = JSON.stringify(post.get('mobiledoc'));
            let scratch = JSON.stringify(post.get('scratch'));
            let title = post.get('title');
            let titleScratch = post.get('titleScratch');
            let changedAttributes;

            if (!this.tagNamesEqual()) {
                return true;
            }

            if (titleScratch !== title) {
                return true;
            }

            // since `scratch` is not post property, we need to check
            // it explicitly against the post's mobiledoc attribute
            if (mobiledoc !== scratch) {
                return true;
            }

            // if the Adapter failed to save the post isError will be true
            // and we should consider the post still dirty.
            if (post.get('isError')) {
                return true;
            }

            // posts created on the client always return `hasDirtyAttributes: true`,
            // so we need to see which properties have actually changed.
            if (post.get('isNew')) {
                changedAttributes = Object.keys(post.changedAttributes());

                if (changedAttributes.length) {
                    return true;
                }

                return false;
            }

            // even though we use the `scratch` prop to show edits,
            // which does *not* change the post's `hasDirtyAttributes` property,
            // `hasDirtyAttributes` will tell us if the other props have changed,
            // as long as the post is not new (post.isNew === false).
            return post.get('hasDirtyAttributes');
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
            path = this.get('post.absoluteUrl');
        } else {
            type = 'Preview';
            path = this.get('post.previewUrl');
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
        } else if (error && error.payload && error.payload.errors && error.payload.errors[0].message) {
            errorMessage = error.payload.errors[0].message;
        } else {
            errorMessage = 'Unknown Error';
        }

        message += `: ${errorMessage}`;
        message = htmlSafe(message);

        notifications.showAlert(message, {type: 'error', delayed: delay, key: 'post.save'});
    },

    saveTitle: task(function* () {
        let post = this.get('post');
        let currentTitle = post.get('title');
        let newTitle = post.get('titleScratch').trim();

        if (currentTitle && newTitle && newTitle === currentTitle) {
            return;
        }

        // this is necessary to force a save when the title is blank
        this.set('hasDirtyAttributes', true);

        // generate a slug if a post is new and doesn't have a title yet or
        // if the title is still '(Untitled)'
        if ((post.get('isNew') && !currentTitle) || currentTitle === DEFAULT_TITLE) {
            yield this.get('generateSlug').perform();
        }

        if (this.get('post.isDraft')) {
            yield this.get('autosave').perform();
        }
    }),

    generateSlug: task(function* () {
        let title = this.get('post.titleScratch');

        // Only set an "untitled" slug once per post
        if (title === DEFAULT_TITLE && this.get('post.slug')) {
            return;
        }

        try {
            let slug = yield this.get('slugGenerator').generateSlug('post', title);

            if (!isBlank(slug)) {
                this.set('post.slug', slug);
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
            this.set('post.scratch', value);

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

        toggleLeaveEditorModal(transition) {
            let leaveTransition = this.get('leaveEditorTransition');

            if (!transition && this.get('showLeaveEditorModal')) {
                this.set('leaveEditorTransition', null);
                this.set('showLeaveEditorModal', false);
                return;
            }

            if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
                this.set('leaveEditorTransition', transition);

                // if a save is running, wait for it to finish then transition
                if (this.get('saveTasks.isRunning')) {
                    return this.get('saveTasks.last').then(() => {
                        transition.retry();
                    });
                }

                // if an autosave is scheduled, cancel it, save then transition
                if (this.get('_autosaveRunning')) {
                    this.send('cancelAutosave');
                    this.get('autosave').cancelAll();

                    return this.get('autosave').perform().then(() => {
                        transition.retry();
                    });
                }

                // we genuinely have unsaved data, show the modal
                this.set('showLeaveEditorModal', true);
            }
        },

        leaveEditor() {
            let transition = this.get('leaveEditorTransition');
            let post = this.get('post');

            if (!transition) {
                this.get('notifications').showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // definitely want to clear the data store and post of any unsaved, client-generated tags
            post.updateTags();

            if (post.get('isNew')) {
                // the user doesn't want to save the new, unsaved post, so delete it.
                post.deleteRecord();
            } else {
                // roll back changes on post props
                post.rollbackAttributes();
            }

            // setting hasDirtyAttributes to false here allows willTransition on the editor route to succeed
            this.set('hasDirtyAttributes', false);

            // since the transition is now certain to complete, we can unset window.onbeforeunload here
            window.onbeforeunload = null;

            return transition.retry();
        },

        updateTitle(newTitle) {
            this.set('post.titleScratch', newTitle);
        },

        toggleDeletePostModal() {
            if (!this.get('post.isNew')) {
                this.toggleProperty('showDeletePostModal');
            }
        },

        toggleReAuthenticateModal() {
            this.toggleProperty('showReAuthenticateModal');
        },

        setWordcount(wordcount) {
            this.set('wordcount', wordcount);
        }
    }
});
