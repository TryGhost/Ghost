import Controller from '@ember/controller';
import Ember from 'ember';
import PostModel from 'ghost-admin/models/post';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import isNumber from 'ghost-admin/utils/isNumber';
import {alias, mapBy, reads} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as controller} from '@ember/controller';
import {htmlSafe} from '@ember/string';
import {isBlank} from '@ember/utils';
import {isArray as isEmberArray} from '@ember/array';
import {isInvalidError} from 'ember-ajax/errors';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task, taskGroup, timeout} from 'ember-concurrency';

const DEFAULT_TITLE = '(Untitled)';

// time in ms to save after last content edit
const AUTOSAVE_TIMEOUT = 3000;
// time in ms to force a save if the user is continuously typing
const TIMEDSAVE_TIMEOUT = 60000;

// this array will hold properties we need to watch for this.hasDirtyAttributes
let watchedProps = ['post.scratch', 'post.titleScratch', 'post.hasDirtyAttributes', 'post.tags.[]', 'post.isError'];

// add all post model attrs to the watchedProps array, easier to do it this way
// than remember to update every time we add a new attr
PostModel.eachAttribute(function (name) {
    watchedProps.push(`post.${name}`);
});

// TODO: This has to be moved to the I18n localization file.
// This structure is supposed to be close to the i18n-localization which will be used soon.
const messageMap = {
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
};

export default Controller.extend({
    application: controller(),
    feature: service(),
    notifications: service(),
    router: service(),
    slugGenerator: service(),
    ui: service(),

    /* public properties -----------------------------------------------------*/

    leaveEditorTransition: null,
    shouldFocusEditor: false,
    showDeletePostModal: false,
    showLeaveEditorModal: false,
    showReAuthenticateModal: false,
    useKoenig: false,

    // koenig related properties
    wordcount: 0,

    /* private properties ----------------------------------------------------*/

    // set by setPost and _postSaved, used in hasDirtyAttributes
    _previousTagNames: null,

    /* computed properties ---------------------------------------------------*/

    post: alias('model'),

    // used within {{gh-editor}} as a trigger for responsive css changes
    navIsClosed: reads('application.autoNav'),

    // store the desired post status locally without updating the model,
    // the model will only be updated when a save occurs
    willPublish: boundOneWay('post.isPublished'),
    willSchedule: boundOneWay('post.isScheduled'),

    // updateSlug and save should always be enqueued so that we don't run into
    // problems with concurrency, for example when Cmd-S is pressed whilst the
    // cursor is in the slug field - that would previously trigger a simultaneous
    // slug update and save resulting in ember data errors and inconsistent save
    // results
    saveTasks: taskGroup().enqueue(),

    _tagNames: mapBy('post.tags', 'name'),

    // computed.apply is a bit of an ugly hack, but necessary to watch all the
    // post's attributes and more without having to be explicit and remember
    // to update the watched props list every time we add a new post attr
    hasDirtyAttributes: computed.apply(Ember, watchedProps.concat({
        get() {
            return this._hasDirtyAttributes();
        },
        set(key, value) {
            return value;
        }
    })),

    _autosaveRunning: computed('_autosave.isRunning', '_timedSave.isRunning', function () {
        let autosave = this.get('_autosave.isRunning');
        let timedsave = this.get('_timedSave.isRunning');

        return autosave || timedsave;
    }),

    _canAutosave: computed('post.isDraft', function () {
        return !Ember.testing && this.get('post.isDraft');
    }),

    /* actions ---------------------------------------------------------------*/

    actions: {
        updateScratch(mobiledoc) {
            this.set('post.scratch', mobiledoc);

            // save 3 seconds after last edit
            this.get('_autosave').perform();
            // force save at 60 seconds
            this.get('_timedSave').perform();
        },

        updateTitleScratch(title) {
            this.set('post.titleScratch', title);
        },

        // updates local willPublish/Schedule values, does not get applied to
        // the post's `status` value until a save is triggered
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

        save(options) {
            return this.get('save').perform(options);
        },

        // used to prevent unexpected background saves. Triggered when opening
        // publish menu, starting a manual save, and when leaving the editor
        cancelAutosave() {
            this.get('_autosave').cancelAll();
            this.get('_timedSave').cancelAll();
        },

        toggleLeaveEditorModal(transition) {
            let leaveTransition = this.get('leaveEditorTransition');

            // "cancel" was clicked in the "are you sure?" modal so we just
            // reset the saved transition and remove the modal
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

        // called by the "are you sure?" modal
        leaveEditor() {
            let transition = this.get('leaveEditorTransition');

            if (!transition) {
                this.get('notifications').showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // perform cleanup and reset manually, ensures the transition will succeed
            this.reset();

            return transition.retry();
        },

        toggleDeletePostModal() {
            if (!this.get('post.isNew')) {
                this.toggleProperty('showDeletePostModal');
            }
        },

        toggleReAuthenticateModal() {
            this.toggleProperty('showReAuthenticateModal');
        },

        // TODO: this should be part of the koenig component
        setWordcount(count) {
            this.set('wordcount', count);
        }
    },

    /* Public tasks ----------------------------------------------------------*/

    // separate task for autosave so that it doesn't override a manual save
    autosave: task(function* () {
        if (!this.get('save.isRunning')) {
            return yield this.get('save').perform({
                silent: true,
                backgroundSave: true
            });
        }
    }).drop(),

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
                if (this.get('willPublish') && !this.get('post.isScheduled')) {
                    status = 'published';
                } else if (this.get('willSchedule') && !this.get('post.isPublished')) {
                    status = 'scheduled';
                } else {
                    status = 'draft';
                }
            }
        }

        // Set the properties that are indirected
        // set mobiledoc equal to what's in the editor
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
                this._showSaveNotification(prevStatus, post.get('status'), isNew ? true : false);
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
                this._showErrorAlert(prevStatus, this.get('post.status'), errorOrMessages);
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
                this._showErrorAlert(status, status, error);
            }

            throw error;
        }
    }).group('saveTasks'),

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

    /* Public methods --------------------------------------------------------*/

    // called by the new/edit routes to change the post model
    setPost(post) {
        // switch between markdown/koenig depending on feature flag and post
        // compatibility
        let koenigEnabled = this.get('feature.koenigEditor');
        let postIsMarkdownCompatible = post.isCompatibleWithMarkdownEditor();
        if (koenigEnabled || !postIsMarkdownCompatible) {
            this.set('useKoenig', true);

            // display an alert if koenig is disabled but we use it anyway
            // because the post is incompatible with the markdown editor
            if (!koenigEnabled) {
                alert('This post will be opened with the Koenig editor because it\'s not compatible with the markdown editor');
            }
        } else {
            this.set('useKoenig', false);
        }

        // don't do anything else if we're setting the same post
        if (post === this.get('post')) {
            // set autofocus as change signal to the persistent editor on new->edit
            this.set('shouldFocusEditor', post.get('isNew'));
            return;
        }

        // reset everything ready for a new post
        this.reset();

        this.set('post', post);

        // autofocus the editor if we have a new post
        this.set('shouldFocusEditor', post.get('isNew'));

        // need to set scratch values because they won't be present on first
        // edit of the post
        // TODO: can these be `boundOneWay` on the model as per the other attrs?
        post.set('titleScratch', post.get('title'));
        post.set('scratch', post.get('mobiledoc'));

        this._previousTagNames = this.get('_tagNames');
        this._attachModelHooks();

        // triggered any time the admin tab is closed, we need to use a native
        // dialog here instead of our custom modal
        window.onbeforeunload = () => {
            if (this.get('hasDirtyAttributes')) {
                return '==============================\n\n'
                     + 'Hey there! It looks like you\'re in the middle of writing'
                     + ' something and you haven\'t saved all of your content.'
                     + '\n\nSave before you go!\n\n'
                     + '==============================';
            }
        };
    },

    // called by editor route's willTransition hook, fires for editor.new->edit,
    // editor.edit->edit, or editor->any. Triggers `toggleLeaveEditorModal` action
    // which will either finish autosave then retry transition or abort and show
    // the "are you sure?" modal
    willTransition(transition) {
        let post = this.get('post');

        // exit early and allow transition if we have no post, occurs if reset
        // has already been called as in the `leaveEditor` action
        if (!post) {
            return;
        }

        let hasDirtyAttributes = this.get('hasDirtyAttributes');
        let state = post.getProperties('isDeleted', 'isSaving', 'hasDirtyAttributes', 'isNew');

        let fromNewToEdit = this.get('router.currentRouteName') === 'editor.new'
            && transition.targetName === 'editor.edit'
            && transition.intent.contexts
            && transition.intent.contexts[0]
            && transition.intent.contexts[0].id === post.get('id');

        let deletedWithoutChanges = state.isDeleted
            && (state.isSaving || !state.hasDirtyAttributes);

        // controller is dirty and we aren't in a new->edit or delete->index
        // transition so show our "are you sure you want to leave?" modal
        if (!fromNewToEdit && !deletedWithoutChanges && hasDirtyAttributes) {
            transition.abort();
            this.send('toggleLeaveEditorModal', transition);
            return;
        }

        // the transition is now certain to complete so cleanup and reset if
        // we're exiting the editor. new->edit keeps everything around and
        // edit->edit will call reset in the setPost method if necessary
        if (!fromNewToEdit && transition.targetName !== 'editor.edit') {
            this.reset();
        }
    },

    // called when the editor route is left or the post model is swapped
    reset() {
        let post = this.get('post');

        // make sure the save tasks aren't still running in the background
        // after leaving the edit route
        this.send('cancelAutosave');

        if (post) {
            // clear post of any unsaved, client-generated tags
            post.updateTags();

            // remove new+unsaved records from the store and rollback any unsaved changes
            if (post.get('isNew')) {
                post.deleteRecord();
            } else {
                post.rollbackAttributes();
            }

            // remove the create/update event handlers that were added to the post
            this._detachModelHooks();
        }

        this._previousTagNames = [];

        this.set('post', null);
        this.set('hasDirtyAttributes', false);
        this.set('shouldFocusEditor', false);
        this.set('leaveEditorTransition', null);

        // remove the onbeforeunload handler as it's only relevant whilst on
        // the editor route
        window.onbeforeunload = null;
    },

    /* Private tasks ---------------------------------------------------------*/

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

        while (!Ember.testing && true) {
            yield timeout(TIMEDSAVE_TIMEOUT);
            this.get('autosave').perform();
        }
    }).drop(),

    /* Private methods -------------------------------------------------------*/

    _hasDirtyAttributes() {
        let post = this.get('post');

        if (!post) {
            return false;
        }

        // if the Adapter failed to save the post isError will be true
        // and we should consider the post still dirty.
        if (post.get('isError')) {
            return true;
        }

        // post.tags is an array so hasDirtyAttributes doesn't pick up
        // changes unless the array ref is changed
        let currentTags = this.getWithDefault('_tagNames', []).join('');
        let previousTags = this.getWithDefault('_previousTagNames', []).join('');
        if (currentTags !== previousTags) {
            return true;
        }

        // titleScratch isn't an attr so needs a manual dirty check
        if (this.get('titleScratch') !== this.get('title')) {
            return true;
        }

        // scratch isn't an attr so needs a manual dirty check
        let mobiledoc = post.get('mobiledoc');
        let scratch = post.get('scratch');
        // additional guard in case we are trying to compare null with undefined
        if (scratch || mobiledoc) {
            let mobiledocJSON = JSON.stringify(mobiledoc);
            let scratchJSON = JSON.stringify(scratch);

            if (scratchJSON !== mobiledocJSON) {
                return true;
            }
        }

        // new+unsaved posts always return `hasDirtyAttributes: true`
        // so we need a manual check to see if any
        if (post.get('isNew')) {
            let changedAttributes = Object.keys(post.changedAttributes());
            return changedAttributes.length ? true : false;
        }

        // we've covered all the non-tracked cases we care about so fall
        // back on Ember Data's default dirty attribute checks
        return post.get('hasDirtyAttributes');
    },

    // post.save() is called in multiple places, rather than remembering to
    // add a .then in every instance we use model hooks to update our local
    // values used for `hasDirtyAttributes`
    _attachModelHooks() {
        let post = this.get('post');
        if (post) {
            post.on('didCreate', this, this._postSaved);
            post.on('didUpdate', this, this._postSaved);
        }
    },

    _detachModelHooks() {
        let post = this.get('post');
        if (post) {
            post.off('didCreate', this, this._postSaved);
            post.off('didUpdate', this, this._postSaved);
        }
    },

    _postSaved() {
        let post = this.get('post');

        // remove any unsaved tags
        // NOTE: `updateTags` changes `hasDirtyAttributes => true`.
        // For a saved post it would otherwise be false.
        post.updateTags();

        this._previousTagNames = this.get('_tagNames');

        // if the two "scratch" properties (title and content) match the post,
        // then it's ok to set hasDirtyAttributes to false
        // TODO: why is this necessary?
        let titlesMatch = post.get('titleScratch') === post.get('title');
        let bodiesMatch = JSON.stringify(post.get('scratch')) === JSON.stringify(post.get('mobiledoc'));

        if (titlesMatch && bodiesMatch) {
            this.set('hasDirtyAttributes', false);
        }
    },

    _showSaveNotification(prevStatus, status, delay) {
        let message = messageMap.success.post[prevStatus][status];
        let notifications = this.get('notifications');
        let type, path;

        if (status === 'published') {
            type = this.get('post.page') ? 'Page' : 'Post';
            path = this.get('post.absoluteUrl');
        } else {
            type = 'Preview';
            path = this.get('post.previewUrl');
        }

        message += `&nbsp;<a href="${path}" target="_blank">View ${type}</a>`;

        notifications.showNotification(message.htmlSafe(), {delayed: delay});
    },

    _showErrorAlert(prevStatus, status, error, delay) {
        let message = messageMap.errors.post[prevStatus][status];
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
    }

});
