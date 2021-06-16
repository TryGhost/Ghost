import Controller from '@ember/controller';
import PostModel from 'ghost-admin/models/post';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import config from 'ghost-admin/config/environment';
import isNumber from 'ghost-admin/utils/isNumber';
import moment from 'moment';
import {action, computed} from '@ember/object';
import {alias, mapBy} from '@ember/object/computed';
import {capitalize} from '@ember/string';
import {inject as controller} from '@ember/controller';
import {get} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {isBlank} from '@ember/utils';
import {isArray as isEmberArray} from '@ember/array';
import {isHostLimitError} from 'ghost-admin/services/ajax';
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
let watchedProps = [
    'post.scratch',
    'post.titleScratch',
    'post.hasDirtyAttributes',
    'post.tags.[]',
    'post.isError'
];

// add all post model attrs to the watchedProps array, easier to do it this way
// than remember to update every time we add a new attr
PostModel.eachAttribute(function (name) {
    watchedProps.push(`post.${name}`);
});

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
                scheduled: 'Update failed',
                draft: 'Unscheduling failed',
                published: 'Publish failed'
            }

        }
    },

    success: {
        post: {
            published: {
                published: 'Updated',
                draft: 'Saved',
                scheduled: 'Scheduled'
            },
            draft: {
                published: 'Published',
                draft: 'Saved',
                scheduled: 'Scheduled'
            },
            scheduled: {
                scheduled: 'Updated',
                draft: 'Unscheduled',
                published: 'Published'
            }
        }
    }
};

export default Controller.extend({
    application: controller(),
    feature: service(),
    membersCountCache: service(),
    notifications: service(),
    router: service(),
    slugGenerator: service(),
    session: service(),
    settings: service(),
    ui: service(),

    /* public properties -----------------------------------------------------*/

    leaveEditorTransition: null,
    shouldFocusTitle: false,
    showDeletePostModal: false,
    showLeaveEditorModal: false,
    showReAuthenticateModal: false,
    showEmailPreviewModal: false,
    showPostPreviewModal: false,
    showUpgradeModal: false,
    showDeleteSnippetModal: false,
    hostLimitError: null,
    // koenig related properties
    wordcount: null,

    /* private properties ----------------------------------------------------*/

    // set by setPost and _postSaved, used in hasDirtyAttributes
    _previousTagNames: null,

    /* computed properties ---------------------------------------------------*/

    post: alias('model'),

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

    hasDirtyAttributes: computed(...watchedProps, {
        get() {
            return this._hasDirtyAttributes();
        },
        set(key, value) {
            return value;
        }
    }),

    _snippets: computed(function () {
        return this.store.peekAll('snippet');
    }),

    snippets: computed('_snippets.@each.{name,isNew}', function () {
        return this._snippets
            .reject(snippet => snippet.get('isNew'))
            .sort((a, b) => a.name.localeCompare(b.name));
    }),

    canManageSnippets: computed('session.user.{isOwnerOrAdmin,isEditor}', function () {
        let {user} = this.session;
        if (user.get('isOwnerOrAdmin') || user.get('isEditor')) {
            return true;
        }
        return false;
    }),

    _autosaveRunning: computed('_autosave.isRunning', '_timedSave.isRunning', function () {
        let autosave = this.get('_autosave.isRunning');
        let timedsave = this.get('_timedSave.isRunning');

        return autosave || timedsave;
    }),

    _canAutosave: computed('post.isDraft', function () {
        return config.environment !== 'test' && this.get('post.isDraft');
    }),

    /* actions ---------------------------------------------------------------*/

    actions: {
        updateScratch(mobiledoc) {
            this.set('post.scratch', mobiledoc);

            // save 3 seconds after last edit
            this._autosave.perform();
            // force save at 60 seconds
            this._timedSave.perform();
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
            return this.save.perform(options);
        },

        // used to prevent unexpected background saves. Triggered when opening
        // publish menu, starting a manual save, and when leaving the editor
        cancelAutosave() {
            this._autosave.cancelAll();
            this._timedSave.cancelAll();
        },

        toggleLeaveEditorModal(transition) {
            let leaveTransition = this.leaveEditorTransition;

            // "cancel" was clicked in the "are you sure?" modal so we just
            // reset the saved transition and remove the modal
            if (!transition && this.showLeaveEditorModal) {
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
                if (this._autosaveRunning) {
                    this.send('cancelAutosave');
                    this.autosave.cancelAll();

                    return this.autosave.perform().then(() => {
                        transition.retry();
                    });
                }

                // we genuinely have unsaved data, show the modal
                if (this.post) {
                    Object.assign(this._leaveModalReason, {status: this.post.status});
                }
                console.log('showing leave editor modal', this._leaveModalReason); // eslint-disable-line
                this.set('showLeaveEditorModal', true);
            }
        },

        // called by the "are you sure?" modal
        leaveEditor() {
            let transition = this.leaveEditorTransition;

            if (!transition) {
                this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
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

        toggleEmailPreviewModal() {
            this.toggleProperty('showEmailPreviewModal');
        },

        togglePostPreviewModal() {
            this.toggleProperty('showPostPreviewModal');
        },

        toggleReAuthenticateModal() {
            this.toggleProperty('showReAuthenticateModal');
        },

        openUpgradeModal() {
            this.set('showUpgradeModal', true);
        },

        closeUpgradeModal() {
            this.set('showUpgradeModal', false);
        },

        setKoenigEditor(koenig) {
            this._koenig = koenig;

            // remove any empty cards when displaying a draft post
            // - empty cards may be left in draft posts due to autosave occuring
            //   whilst an empty card is present then the user closing the browser
            //   or refreshing the page
            if (this.post.isDraft) {
                this._koenig.cleanup();
            }
        },

        updateWordCount(counts) {
            this.set('wordCount', counts);
        },

        setFeatureImage(url) {
            this.post.set('featureImage', url);

            if (this.post.isDraft) {
                this.autosave.perform();
            }
        },

        clearFeatureImage() {
            this.post.set('featureImage', null);
            this.post.set('featureImageAlt', null);
            this.post.set('featureImageCaption', null);

            if (this.post.isDraft) {
                this.autosave.perform();
            }
        },

        setFeatureImageAlt(text) {
            this.post.set('featureImageAlt', text);

            if (this.post.isDraft) {
                this.autosave.perform();
            }
        },

        setFeatureImageCaption(html) {
            this.post.set('featureImageCaption', html);

            if (this.post.isDraft) {
                this.autosave.perform();
            }
        }
    },

    saveSnippet: action(function (snippet) {
        let snippetRecord = this.store.createRecord('snippet', snippet);
        return snippetRecord.save().then(() => {
            this.notifications.closeAlerts('snippet.save');
            this.notifications.showNotification(
                `Snippet saved as "${snippet.name}"`,
                {type: 'success'}
            );
            return snippetRecord;
        }).catch((error) => {
            if (!snippetRecord.errors.isEmpty) {
                this.notifications.showAlert(
                    `Snippet save failed: ${snippetRecord.errors.messages.join('. ')}`,
                    {type: 'error', key: 'snippet.save'}
                );
            }
            snippetRecord.rollbackAttributes();
            throw error;
        });
    }),

    toggleDeleteSnippetModal: action(function (snippet) {
        this.set('snippetToDelete', snippet);
    }),

    deleteSnippet: action(function (snippet) {
        return snippet.destroyRecord();
    }),

    /* Public tasks ----------------------------------------------------------*/

    // separate task for autosave so that it doesn't override a manual save
    autosave: task(function* () {
        if (!this.get('save.isRunning')) {
            return yield this.save.perform({
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

        if (options.backgroundSave && !this.hasDirtyAttributes) {
            return;
        }

        if (options.backgroundSave) {
            // do not allow a post's status to be set to published by a background save
            status = 'draft';
        } else {
            if (this.get('post.pastScheduledTime')) {
                status = (!this.willSchedule && !this.willPublish) ? 'draft' : 'published';
            } else {
                if (this.willPublish && !this.get('post.isScheduled')) {
                    status = 'published';
                } else if (this.willSchedule && !this.get('post.isPublished')) {
                    status = 'scheduled';
                } else {
                    status = 'draft';
                }
            }

            // let the adapter know it should use the `?email_recipient_filter` QP when saving
            let isPublishing = status === 'published' && !this.post.isPublished;
            let isScheduling = status === 'scheduled' && !this.post.isScheduled;
            if (options.sendEmailWhenPublished && (isPublishing || isScheduling)) {
                options.adapterOptions = Object.assign({}, options.adapterOptions, {sendEmailWhenPublished: options.sendEmailWhenPublished});
            }
        }

        // ensure we remove any blank cards when performing a full save
        if (!options.backgroundSave) {
            if (this._koenig) {
                this._koenig.cleanup();
                this.set('hasDirtyAttributes', true);
            }
        }

        // Set the properties that are indirected
        // set mobiledoc equal to what's in the editor but create a copy so that
        // nested objects/arrays don't keep references which can mean that both
        // scratch and mobiledoc get updated simultaneously
        this.set('post.mobiledoc', JSON.parse(JSON.stringify(this.post.scratch || null)));
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
        this.set('post.emailSubject', this.get('post.emailSubjectScratch'));

        if (!this.get('post.slug')) {
            this.saveTitleTask.cancelAll();

            yield this.generateSlug.perform();
        }

        try {
            let post = yield this._savePost.perform(options);

            post.set('statusScratch', null);

            if (!options.silent) {
                this.set('showPostPreviewModal', false);
                this._showSaveNotification(prevStatus, post.get('status'), isNew ? true : false);
            }

            // redirect to edit route if saving a new record
            if (isNew && post.get('id')) {
                if (!this.leaveEditorTransition) {
                    this.replaceRoute('editor.edit', post);
                }
                return true;
            }

            return post;
        } catch (error) {
            // trigger upgrade modal if forbidden(403) error
            if (isHostLimitError(error)) {
                this.post.rollbackAttributes();
                this.set('hostLimitError', error.payload.errors[0]);
                this.set('showUpgradeModal', true);
                return;
            }

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

            return this.post;
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

        serverSlug = yield this.slugGenerator.generateSlug('post', newSlug);

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

        return yield this._savePost.perform();
    }).group('saveTasks'),

    // used in the PSM so that saves are sequential and don't trigger collision
    // detection errors
    savePost: task(function* () {
        try {
            return yield this._savePost.perform();
        } catch (error) {
            if (error === undefined) {
                // validation error
                return;
            }

            if (error) {
                let status = this.get('post.status');
                this._showErrorAlert(status, status, error);
            }

            throw error;
        }
    }).group('saveTasks'),

    // convenience method for saving the post and performing post-save cleanup
    _savePost: task(function* (options) {
        let {post} = this;

        yield post.save(options);

        // remove any unsaved tags
        // NOTE: `updateTags` changes `hasDirtyAttributes => true`.
        // For a saved post it would otherwise be false.
        post.updateTags();
        this._previousTagNames = this._tagNames;

        // update the scratch property if it's `null` and we get a blank mobiledoc
        // back from the API - prevents "unsaved changes" modal on new+blank posts
        if (!post.scratch) {
            post.set('scratch', JSON.parse(JSON.stringify(post.get('mobiledoc'))));
        }

        // if the two "scratch" properties (title and content) match the post,
        // then it's ok to set hasDirtyAttributes to false
        // TODO: why is this necessary?
        let titlesMatch = post.get('titleScratch') === post.get('title');
        let bodiesMatch = JSON.stringify(post.get('scratch')) === JSON.stringify(post.get('mobiledoc'));

        if (titlesMatch && bodiesMatch) {
            this.set('hasDirtyAttributes', false);
        }

        return post;
    }),

    saveTitleTask: task(function* () {
        let post = this.post;
        let currentTitle = post.get('title');
        let newTitle = post.get('titleScratch').trim();

        if ((currentTitle && newTitle && newTitle === currentTitle) || (!currentTitle && !newTitle)) {
            return;
        }

        // this is necessary to force a save when the title is blank
        this.set('hasDirtyAttributes', true);

        // generate a slug if a post is new and doesn't have a title yet or
        // if the title is still '(Untitled)'
        if ((post.get('isNew') && !currentTitle) || currentTitle === DEFAULT_TITLE) {
            yield this.generateSlug.perform();
        }

        if (this.get('post.isDraft')) {
            yield this.autosave.perform();
        }

        this.ui.updateDocumentTitle();
    }),

    generateSlug: task(function* () {
        let title = this.get('post.titleScratch');

        // Only set an "untitled" slug once per post
        if (title === DEFAULT_TITLE && this.get('post.slug')) {
            return;
        }

        try {
            let slug = yield this.slugGenerator.generateSlug('post', title);

            if (!isBlank(slug)) {
                this.set('post.slug', slug);
            }
        } catch (error) {
            // Nothing to do (would be nice to log this somewhere though),
            // but a rejected promise needs to be handled here so that a resolved
            // promise is returned.
            if (isVersionMismatchError(error)) {
                this.notifications.showAPIError(error);
            }
        }
    }).enqueue(),

    // load supplementel data such as the members count in the background
    backgroundLoader: task(function* () {
        try {
            let membersResponse = yield this.store.query('member', {limit: 1, filter: 'subscribed:true'});
            this.set('memberCount', get(membersResponse, 'meta.pagination.total'));
        } catch (error) {
            this.set('memberCount', 0);
        }

        yield this.store.query('snippet', {limit: 'all'});
    }).restartable(),

    /* Public methods --------------------------------------------------------*/

    // called by the new/edit routes to change the post model
    setPost(post) {
        // don't do anything else if we're setting the same post
        if (post === this.post) {
            this.set('shouldFocusTitle', post.get('isNew'));
            return;
        }

        // reset everything ready for a new post
        this.reset();

        this.set('post', post);
        this.backgroundLoader.perform();

        // autofocus the title if we have a new post
        this.set('shouldFocusTitle', post.get('isNew'));

        // need to set scratch values because they won't be present on first
        // edit of the post
        // TODO: can these be `boundOneWay` on the model as per the other attrs?
        post.set('titleScratch', post.get('title'));
        post.set('scratch', post.get('mobiledoc'));

        this._previousTagNames = this._tagNames;

        // triggered any time the admin tab is closed, we need to use a native
        // dialog here instead of our custom modal
        window.onbeforeunload = () => {
            if (this.hasDirtyAttributes) {
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
        let post = this.post;

        // exit early and allow transition if we have no post, occurs if reset
        // has already been called as in the `leaveEditor` action
        if (!post) {
            return;
        }

        // clean up blank cards when leaving the editor if we have a draft post
        // - blank cards could be left around due to autosave triggering whilst
        //   a blank card is present then the user attempting to leave
        // - will mark the post as dirty so it gets saved when transitioning
        if (this._koenig && post.isDraft) {
            this._koenig.cleanup();
        }

        let hasDirtyAttributes = this.hasDirtyAttributes;
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
        let post = this.post;

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
        }

        this._previousTagNames = [];

        this.set('post', null);
        this.set('hasDirtyAttributes', false);
        this.set('shouldFocusTitle', false);
        this.set('leaveEditorTransition', null);
        this.set('showLeaveEditorModal', false);
        this.set('showPostPreviewModal', false);
        this.set('wordCount', null);

        // remove the onbeforeunload handler as it's only relevant whilst on
        // the editor route
        window.onbeforeunload = null;
    },

    /* Private tasks ---------------------------------------------------------*/

    // save 3 seconds after the last edit
    _autosave: task(function* () {
        if (!this._canAutosave) {
            return;
        }

        // force an instant save on first body edit for new posts
        if (this.get('post.isNew')) {
            return this.autosave.perform();
        }

        yield timeout(AUTOSAVE_TIMEOUT);
        this.autosave.perform();
    }).restartable(),

    // save at 60 seconds even if the user doesn't stop typing
    _timedSave: task(function* () {
        if (!this._canAutosave) {
            return;
        }

        while (config.environment !== 'test' && true) {
            yield timeout(TIMEDSAVE_TIMEOUT);
            this.autosave.perform();
        }
    }).drop(),

    /* Private methods -------------------------------------------------------*/

    _hasDirtyAttributes() {
        let post = this.post;

        if (!post) {
            return false;
        }

        // if the Adapter failed to save the post isError will be true
        // and we should consider the post still dirty.
        if (post.get('isError')) {
            this._leaveModalReason = {reason: 'isError', context: post.errors.messages};
            return true;
        }

        // post.tags is an array so hasDirtyAttributes doesn't pick up
        // changes unless the array ref is changed
        let currentTags = (this._tagNames || []).join(', ');
        let previousTags = (this._previousTagNames || []).join(', ');
        if (currentTags !== previousTags) {
            this._leaveModalReason = {reason: 'tags are different', context: {currentTags, previousTags}};
            return true;
        }

        // titleScratch isn't an attr so needs a manual dirty check
        if (this.titleScratch !== this.title) {
            this._leaveModalReason = {reason: 'title is different', context: {current: this.title, scratch: this.titleScratch}};
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
                this._leaveModalReason = {reason: 'mobiledoc is different', context: {current: mobiledocJSON, scratch: scratchJSON}};
                return true;
            }
        }

        // new+unsaved posts always return `hasDirtyAttributes: true`
        // so we need a manual check to see if any
        if (post.get('isNew')) {
            let changedAttributes = Object.keys(post.changedAttributes());

            if (changedAttributes.length) {
                this._leaveModalReason = {reason: 'post.changedAttributes.length > 0', context: post.changedAttributes()};
            }
            return changedAttributes.length ? true : false;
        }

        // we've covered all the non-tracked cases we care about so fall
        // back on Ember Data's default dirty attribute checks
        let {hasDirtyAttributes} = post;

        if (hasDirtyAttributes) {
            this._leaveModalReason = {reason: 'post.hasDirtyAttributes === true', context: post.changedAttributes()};
        }

        return hasDirtyAttributes;
    },

    _showSaveNotification(prevStatus, status, delayed) {
        // scheduled messaging is completely custom
        if (status === 'scheduled') {
            return this._showScheduledNotification(delayed);
        }

        let notifications = this.notifications;
        let message = messageMap.success.post[prevStatus][status];
        let actions, type, path;

        if (status === 'published' || status === 'scheduled') {
            type = capitalize(this.get('post.displayName'));
            path = this.get('post.url');
            actions = `<a href="${path}" target="_blank">View ${type}</a>`;
        }

        notifications.showNotification(message, {type: 'success', actions: (actions && actions.htmlSafe()), delayed});
    },

    async _showScheduledNotification(delayed) {
        let {
            publishedAtUTC,
            emailRecipientFilter,
            previewUrl
        } = this.post;
        let publishedAtBlogTZ = moment.tz(publishedAtUTC, this.settings.get('timezone'));

        let title = 'Scheduled';
        let description = ['Will be published'];

        if (emailRecipientFilter && emailRecipientFilter !== 'none') {
            const recipientCount = await this.membersCountCache.countString(`subscribed:true+(${emailRecipientFilter})`);
            description.push(`and delivered to <span><strong>${recipientCount}</strong></span>`);
        }

        description.push(`on <span><strong>${publishedAtBlogTZ.format('MMM Do')}</strong></span>`);

        description.push(`at <span><strong>${publishedAtBlogTZ.format('HH:mm')}</strong>`);
        if (publishedAtBlogTZ.utcOffset() === 0) {
            description.push('(UTC)</span>');
        } else {
            description.push(`(UTC${publishedAtBlogTZ.format('Z').replace(/([+-])0/, '$1').replace(/:00/, '')})</span>`);
        }

        description = description.join(' ').htmlSafe();

        let actions = `<a href="${previewUrl}" target="_blank">View Preview</a>`.htmlSafe();

        return this.notifications.showNotification(title, {description, actions, type: 'success', delayed});
    },

    _showErrorAlert(prevStatus, status, error, delay) {
        let message = messageMap.errors.post[prevStatus][status];
        let notifications = this.notifications;
        let errorMessage;

        function isString(str) {
            return toString.call(str) === '[object String]';
        }

        if (error && isString(error)) {
            errorMessage = error;
        } else if (error && isEmberArray(error)) {
            // This is here because validation errors are returned as an array
            // TODO: remove this once validations are fixed
            errorMessage = error[0];
        } else if (error && error.payload && error.payload.errors && error.payload.errors[0].message) {
            return this.notifications.showAPIError(error, {key: 'post.save'});
        } else {
            errorMessage = 'Unknown Error';
        }

        message += `: ${errorMessage}`;
        message = htmlSafe(message);

        notifications.showAlert(message, {type: 'error', delayed: delay, key: 'post.save'});
    }

});
