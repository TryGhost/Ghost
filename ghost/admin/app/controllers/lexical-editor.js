import * as Sentry from '@sentry/ember';
import ConfirmEditorLeaveModal from '../components/modals/editor/confirm-leave';
import Controller, {inject as controller} from '@ember/controller';
import DeletePostModal from '../components/modals/delete-post';
import DeleteSnippetModal from '../components/editor/modals/delete-snippet';
import PostModel from 'ghost-admin/models/post';
import PublishLimitModal from '../components/modals/limits/publish-limit';
import ReAuthenticateModal from '../components/editor/modals/re-authenticate';
import UpdateSnippetModal from '../components/editor/modals/update-snippet';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import classic from 'ember-classic-decorator';
import config from 'ghost-admin/config/environment';
import isNumber from 'ghost-admin/utils/isNumber';
import moment from 'moment-timezone';
import {GENERIC_ERROR_MESSAGE} from '../services/notifications';
import {action, computed} from '@ember/object';
import {alias, mapBy} from '@ember/object/computed';
import {capitalize} from '@ember/string';
import {dropTask, enqueueTask, restartableTask, task, taskGroup, timeout} from 'ember-concurrency';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {isBlank} from '@ember/utils';
import {isArray as isEmberArray} from '@ember/array';
import {isHostLimitError, isServerUnreachableError, isVersionMismatchError} from 'ghost-admin/services/ajax';
import {isInvalidError} from 'ember-ajax/errors';
import {mobiledocToLexical} from '@tryghost/kg-converters';
import {inject as service} from '@ember/service';

const DEFAULT_TITLE = '(Untitled)';
// suffix that is applied to the title of a post when it has been duplicated
const DUPLICATED_POST_TITLE_SUFFIX = '(Copy)';
// time in ms to save after last content edit
const AUTOSAVE_TIMEOUT = 3000;
// time in ms to force a save if the user is continuously typing
const TIMEDSAVE_TIMEOUT = 60000;
// time in ms to force a save even if the post is already saved so we trigger a new revision on the server
const REVISIONSAVE_TIMEOUT = 1000 * 60 * 10; // 10 minutes

// this array will hold properties we need to watch for this.hasDirtyAttributes
let watchedProps = [
    'post.lexicalScratch',
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
                scheduled: 'Scheduled',
                sent: 'Sent'
            },
            draft: {
                published: 'Published',
                draft: 'Saved',
                scheduled: 'Scheduled',
                sent: 'Sent'
            },
            scheduled: {
                scheduled: 'Updated',
                draft: 'Unscheduled',
                published: 'Published',
                sent: 'Sent'
            },
            sent: {
                sent: 'Updated'
            }
        }
    }
};

@classic
export default class LexicalEditorController extends Controller {
    @controller application;

    @service feature;
    @service membersCountCache;
    @service modals;
    @service notifications;
    @service router;
    @service slugGenerator;
    @service session;
    @service settings;
    @service ui;

    @inject config;

    /* public properties -----------------------------------------------------*/

    shouldFocusTitle = false;
    showSettingsMenu = false;

    /**
     * Flag used to determine if we should return to the analytics page or to the posts/pages overview
     */
    fromAnalytics = false;

    // koenig related properties
    wordCount = 0;

    /* private properties ----------------------------------------------------*/

    _leaveConfirmed = false;
    _previousTagNames = null; // set by setPost and _postSaved, used in hasDirtyAttributes

    /* computed properties ---------------------------------------------------*/

    @alias('model')
        post;

    // store the desired post status locally without updating the model,
    // the model will only be updated when a save occurs
    @boundOneWay('post.isPublished')
        willPublish;

    @boundOneWay('post.isScheduled')
        willSchedule;

    // updateSlugTask and saveTask should always be enqueued so that we don't run into
    // problems with concurrency, for example when Cmd-S is pressed whilst the
    // cursor is in the slug field - that would previously trigger a simultaneous
    // slug update and save resulting in ember data errors and inconsistent save
    // results
    @(taskGroup().enqueue())
        saveTasks;

    @mapBy('post.tags', 'name')
        _tagNames;

    @computed(...watchedProps)
    get hasDirtyAttributes() {
        return this._hasDirtyAttributes();
    }

    set hasDirtyAttributes(value) {
        // eslint-disable-next-line no-setter-return
        return value;
    }

    @computed
    get _snippets() {
        return this.store.peekAll('snippet');
    }

    @computed('_snippets.@each.{name,isNew,mobiledoc,lexical}')
    get snippets() {
        const snippets = this._snippets
            .reject(snippet => snippet.get('isNew'))
            .sort((a, b) => a.name.localeCompare(b.name))
            .filter(item => item.lexical !== null);

        return snippets.map((item) => {
            item.value = JSON.stringify(item.lexical);

            return item;
        });
    }

    @computed
    get collections() {
        return this.store.peekAll('collection');
    }

    @computed('session.user.{isAdmin,isEditor}')
    get canManageSnippets() {
        let {user} = this.session;
        if (user.get('isAdmin') || user.get('isEditor')) {
            return true;
        }
        return false;
    }

    @computed('_autosaveTask.isRunning', '_timedSaveTask.isRunning', '_revisionSaveTask.isRunning')
    get _autosaveRunning() {
        let autosave = this.get('_autosaveTask.isRunning');
        let timedsave = this.get('_timedSaveTask.isRunning');
        let revisionsave = this.get('_revisionSaveTask.isRunning');

        return autosave || timedsave || revisionsave;
    }

    @computed('post.isDraft')
    get _canAutosave() {
        return config.environment !== 'test' && this.get('post.isDraft');
    }

    @action
    updateScratch(lexical) {
        this.set('post.lexicalScratch', JSON.stringify(lexical));

        // save 3 seconds after last edit
        this._autosaveTask.perform();
        // force save at 60 seconds
        this._timedSaveTask.perform();
        // force save at 10 minutes to trigger revision
        this._revisionSaveTask.perform();
    }

    @action
    updateTitleScratch(title) {
        this.set('post.titleScratch', title);
    }

    // updates local willPublish/Schedule values, does not get applied to
    // the post's `status` value until a save is triggered
    @action
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
    }

    @action
    save(options) {
        return this.saveTask.perform(options);
    }

    // used to prevent unexpected background saves. Triggered when opening
    // publish menu, starting a manual save, and when leaving the editor
    @action
    cancelAutosave() {
        this._autosaveTask.cancelAll();
        this._timedSaveTask.cancelAll();
        this._revisionSaveTask.cancelAll();
    }

    // called by the "are you sure?" modal
    @action
    leaveEditor() {
        let transition = this.leaveEditorTransition;

        if (!transition) {
            this.notifications.showAlert(GENERIC_ERROR_MESSAGE, {type: 'error'});
            return;
        }

        // perform cleanup and reset manually, ensures the transition will succeed
        this.reset();

        return transition.retry();
    }

    @action
    openDeletePostModal() {
        if (!this.get('post.isNew')) {
            this.modals.open(DeletePostModal, {
                post: this.post
            });
        }
    }

    @action
    openUpgradeModal(hostLimitError = {}) {
        this.modals.open(PublishLimitModal, {
            message: hostLimitError.message,
            details: hostLimitError.details
        });
    }

    @action
    setKoenigEditor(koenig) {
        this._koenig = koenig;

        // remove any empty cards when displaying a draft post
        // - empty cards may be left in draft posts due to autosave occuring
        //   whilst an empty card is present then the user closing the browser
        //   or refreshing the page
        // TODO: not yet implemented in react editor
        // if (this.post.isDraft) {
        //     this._koenig.cleanup();
        // }
    }

    @action
    updateWordCount(count) {
        this.set('wordCount', count);
    }

    @action
    setFeatureImage(url) {
        this.post.set('featureImage', url);

        if (this.post.isDraft) {
            this.autosaveTask.perform();
        }
    }

    @action
    registerEditorAPI(API) {
        this.editorAPI = API;
    }

    @action
    clearFeatureImage() {
        this.post.set('featureImage', null);
        this.post.set('featureImageAlt', null);
        this.post.set('featureImageCaption', null);

        if (this.post.isDraft) {
            this.autosaveTask.perform();
        }
    }

    @action
    setFeatureImageAlt(text) {
        this.post.set('featureImageAlt', text);

        if (this.post.isDraft) {
            this.autosaveTask.perform();
        }
    }

    @action
    setFeatureImageCaption(html) {
        this.post.set('featureImageCaption', html);

        if (this.post.isDraft) {
            this.autosaveTask.perform();
        }
    }

    @action
    toggleSettingsMenu() {
        this.set('showSettingsMenu', !this.showSettingsMenu);
    }

    @action
    closeSettingsMenu() {
        this.set('showSettingsMenu', false);
    }

    @action
    saveNewSnippet(snippet) {
        const snippetData = {name: snippet.name, lexical: JSON.parse(snippet.value), mobiledoc: {}};
        const snippetRecord = this.store.createRecord('snippet', snippetData);

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
    }

    @action
    async createSnippet(data) {
        const snippetNameLC = data.name.trim().toLowerCase();
        const existingSnippet = this.snippets.find(snippet => snippet.name.toLowerCase() === snippetNameLC);

        if (existingSnippet) {
            await this.confirmUpdateSnippet(existingSnippet, {lexical: JSON.parse(data.value)});
        } else {
            await this.saveNewSnippet(data);
        }
    }

    @action
    async confirmUpdateSnippet(snippet, updatedProperties = {}) {
        await this.modals.open(UpdateSnippetModal, {
            snippet,
            updatedProperties
        });
    }

    @action
    async confirmDeleteSnippet(snippet) {
        await this.modals.open(DeleteSnippetModal, {
            snippet
        });
    }

    /* Public tasks ----------------------------------------------------------*/

    // separate task for autosave so that it doesn't override a manual save
    @dropTask
    *autosaveTask(options) {
        if (!this.get('saveTask.isRunning')) {
            return yield this.saveTask.perform({
                silent: true,
                backgroundSave: true,
                ...options
            });
        }
    }

    // save tasks cancels autosave before running, although this cancels the
    // _xSave tasks  that will also cancel the autosave task
    @task({group: 'saveTasks'})
    *saveTask(options = {}) {
        let prevStatus = this.get('post.status');
        let isNew = this.get('post.isNew');
        let status;
        const adapterOptions = {};

        this.cancelAutosave();

        if (options.backgroundSave && !this.hasDirtyAttributes && !options.leavingEditor && !options.saveRevision) {
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
                } else if (this.get('post.isSent')) {
                    status = 'sent';
                } else {
                    status = 'draft';
                }
            }
        }

        // set manually here instead of in beforeSaveTask because the
        // new publishing flow sets the post status manually on publish
        this.set('post.status', status);

        const explicitSave = !options.backgroundSave;
        const leavingEditor = options.leavingEditor;
        if (explicitSave || leavingEditor) {
            adapterOptions.saveRevision = 1;
        }
        yield this.beforeSaveTask.perform(options);

        try {
            let post = yield this._savePostTask.perform({...options, adapterOptions});

            post.set('statusScratch', null);

            // Clear any error notification (if any)
            this.notifications.clearAll();

            if (!options.silent) {
                this._showSaveNotification(prevStatus, post.get('status'), isNew ? true : false);
            }

            // redirect to edit route if saving a new record
            if (isNew && post.get('id')) {
                if (!this.leaveEditorTransition) {
                    this.replaceRoute('lexical-editor.edit', post);
                }
                return true;
            }

            // Even if we've just saved and nothing else has changed, we want to save in 10 minutes to force a revision
            this._revisionSaveTask.perform();

            return post;
        } catch (error) {
            if (!this.session.isAuthenticated) {
                yield this.modals.open(ReAuthenticateModal);

                if (this.session.isAuthenticated) {
                    this.saveTask.perform(options);
                    return;
                }
            }

            this.set('post.status', prevStatus);

            if (error === undefined && this.post.errors.length === 0) {
                // "handled" error from _saveTask
                return;
            }

            // trigger upgrade modal if forbidden(403) error
            if (isHostLimitError(error)) {
                this.post.rollbackAttributes();
                this.openUpgradeModal(error.payload.errors[0]);
                return;
            }

            // re-throw if we have a general server error
            if (error && !isInvalidError(error)) {
                this.send('error', error);
                return;
            }

            if (!options.silent) {
                let errorOrMessages = error || this.get('post.errors.messages');
                this._showErrorAlert(prevStatus, this.get('post.status'), errorOrMessages);
                // simulate a validation error for upstream tasks
                throw undefined;
            }

            return this.post;
        }
    }

    @task
    *beforeSaveTask(options = {}) {
        // ensure we remove any blank cards when performing a full save
        if (!options.backgroundSave) {
            // TODO: not yet implemented in react editor
            // if (this._koenig) {
            //     this._koenig.cleanup();
            //     this.set('hasDirtyAttributes', true);
            // }
        }

        // TODO: There's no need for (at least) most of these scratch values.
        // Refactor so we're setting model attributes directly

        // Set the properties that are indirected

        // Set lexical equal to what's in the editor but create a copy so that
        // nested objects/arrays don't keep references which can mean that both
        // scratch and lexical get updated simultaneously
        this.set('post.lexical', this.post.lexicalScratch || null);

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

            yield this.generateSlugTask.perform();
        }
    }

    /*
     * triggered by a user manually changing slug
     */
    @task({group: 'saveTasks'})
    *updateSlugTask(_newSlug) {
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

        return yield this._savePostTask.perform();
    }

    // used in the PSM so that saves are sequential and don't trigger collision
    // detection errors
    @task({group: 'saveTasks'})
    *savePostTask() {
        try {
            return yield this._savePostTask.perform();
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
    }

    // convenience method for saving the post and performing post-save cleanup
    @task
    *_savePostTask(options = {}) {
        let {post} = this;

        const previousEmailOnlyValue = this.post.emailOnly;

        if (Object.prototype.hasOwnProperty.call(options, 'emailOnly')) {
            this.post.set('emailOnly', options.emailOnly);
        }

        try {
            yield post.save(options);
        } catch (error) {
            this.post.set('emailOnly', previousEmailOnlyValue);
            if (isServerUnreachableError(error)) {
                const [prevStatus, newStatus] = this.post.changedAttributes().status || [this.post.status, this.post.status];
                this._showErrorAlert(prevStatus, newStatus, error);

                // simulate a validation error so we don't end up on a 500 screen
                throw undefined;
            }

            throw error;
        }

        this.afterSave(post);

        return post;
    }

    @action
    afterSave(post) {
        this.notifications.closeAlerts('post.save');

        // remove any unsaved tags
        // NOTE: `updateTags` changes `hasDirtyAttributes => true`.
        // For a saved post it would otherwise be false.
        post.updateTags();
        this._previousTagNames = this._tagNames;

        // update the scratch property if it's `null` and we get a blank lexical
        // back from the API - prevents "unsaved changes" modal on new+blank posts
        if (!post.lexicalScratch) {
            post.set('lexicalScratch', post.get('lexical'));
        }

        // if the two "scratch" properties (title and content) match the post,
        // then it's ok to set hasDirtyAttributes to false
        // TODO: why is this necessary?
        let titlesMatch = post.get('titleScratch') === post.get('title');
        let bodiesMatch = post.get('lexicalScratch') === post.get('lexical');

        if (titlesMatch && bodiesMatch) {
            this.set('hasDirtyAttributes', false);
        }
    }

    @task
    *saveTitleTask() {
        let post = this.post;
        let currentTitle = post.get('title');
        let newTitle = post.get('titleScratch').trim();

        if ((currentTitle && newTitle && newTitle === currentTitle) || (!currentTitle && !newTitle)) {
            return;
        }

        // this is necessary to force a save when the title is blank
        this.set('hasDirtyAttributes', true);

        // generate slug if post
        //  - is new and doesn't have a title yet
        //  - still has the default title
        //  - previously had a title that ended with the duplicated post title suffix
        if (
            (post.get('isNew') && !currentTitle) ||
            (currentTitle === DEFAULT_TITLE) ||
            currentTitle?.endsWith(DUPLICATED_POST_TITLE_SUFFIX)
        ) {
            yield this.generateSlugTask.perform();
        }

        if (this.get('post.isDraft')) {
            yield this.autosaveTask.perform();
        }

        this.ui.updateDocumentTitle();
    }

    @enqueueTask
    *generateSlugTask() {
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
    }

    // load supplemental data such as snippets and collections in the background
    @restartableTask
    *backgroundLoaderTask() {
        yield this.store.query('snippet', {limit: 'all'});
        if (this.post.displayName === 'page' && this.feature.get('collections') && this.feature.get('collectionsCard')) {
            yield this.store.query('collection', {limit: 'all'});
        }
        this.syncMobiledocSnippets();
    }

    @action
    async syncMobiledocSnippets() {
        const snippets = this.store.peekAll('snippet');

        // very early in the beta we had a bug where lexical snippets were saved with double-encoded JSON
        // we fix that here by re-saving any snippets that are still in that state
        const snippetFixSaves = [];
        snippets.forEach((snippet) => {
            if (typeof snippet.lexical === 'string') {
                try {
                    snippet.lexical = JSON.parse(snippet.lexical);
                    snippet.mobiledoc = {};
                    snippetFixSaves.push(snippet.save());
                } catch (e) {
                    snippet.lexical = null;
                    snippetFixSaves.push(snippet.save());

                    console.error(e); // eslint-disable-line no-console

                    if (this.config.sentry_dsn) {
                        Sentry.captureException(e, {
                            tags: {
                                lexical: true
                            }
                        });
                    }
                }
            }
        });
        await Promise.all(snippetFixSaves);

        snippets.forEach((snippet) => {
            if (!snippet.lexical || snippet.lexical.syncedAt && moment.utc(snippet.lexical.syncedAt).isBefore(snippet.updatedAtUTC)) {
                const serializedLexical = mobiledocToLexical(JSON.stringify(snippet.mobiledoc));

                // we get a full Lexical doc from the converter but Lexical only
                // stores an array of nodes in it's copy/paste dataset that we use for snippets
                const lexical = JSON.parse(serializedLexical);
                let nodes = lexical.root.children;

                // for a single-paragraph text selection Lexical only stores the
                // text children in the nodes array
                if (nodes.length === 1 && nodes[0].type === 'paragraph') {
                    nodes = nodes[0].children;
                }

                const lexicalData = {
                    namespace: 'KoenigEditor',
                    nodes
                };

                // set syncedAt so we can check if mobiledoc has been updated in next sync
                lexicalData.syncedAt = moment.utc().toISOString();

                snippet.lexical = lexicalData;

                // kick off a background save, we already have .lexical updated which is what we need
                snippet.save();
            }
        });
    }

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
        this.backgroundLoaderTask.perform();

        // autofocus the title if we have a new post
        this.set('shouldFocusTitle', post.get('isNew'));

        // need to set scratch values because they won't be present on first
        // edit of the post
        // TODO: can these be `boundOneWay` on the model as per the other attrs?
        post.set('titleScratch', post.get('title'));
        post.set('lexicalScratch', post.get('lexical'));

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
    }

    // called by editor route's willTransition hook, fires for editor.new->edit,
    // editor.edit->edit, or editor->any. Will either finish autosave then retry
    // transition or abort and show the "are you sure want to leave?" modal
    async willTransition(transition) {
        let post = this.post;

        // exit early and allow transition if we have no post, occurs if reset
        // has already been called
        if (!post) {
            return;
        }

        // clean up blank cards when leaving the editor if we have a draft post
        // - blank cards could be left around due to autosave triggering whilst
        //   a blank card is present then the user attempting to leave
        // - will mark the post as dirty so it gets saved when transitioning
        // TODO: not yet implemented in react editor
        // if (this._koenig && post.isDraft) {
        //     this._koenig.cleanup();
        // }

        // user can enter the slug name and then leave the post page,
        // in such case we should wait until the slug would be saved on backend
        if (this.updateSlugTask.isRunning) {
            transition.abort();
            await this.updateSlugTask.last;
            return transition.retry();
        }

        let hasDirtyAttributes = this.hasDirtyAttributes;
        let state = post.getProperties('isDeleted', 'isSaving', 'hasDirtyAttributes', 'isNew');

        // Check if anything has changed since the last revision
        let postRevisions = post.get('postRevisions').toArray();
        let latestRevision = postRevisions[postRevisions.length - 1];
        let hasChangedSinceLastRevision = post.get('lexical') !== latestRevision.get('lexical');

        let fromNewToEdit = this.router.currentRouteName === 'lexical-editor.new'
            && transition.targetName === 'lexical-editor.edit'
            && transition.intent.contexts
            && transition.intent.contexts[0]
            && transition.intent.contexts[0].id === post.id;

        let deletedWithoutChanges = state.isDeleted
            && (state.isSaving || !state.hasDirtyAttributes);

        // If leaving the editor and the post has changed since we last saved a revision, always save a new revision
        if (hasChangedSinceLastRevision) {
            transition.abort();
            if (this._autosaveRunning) {
                this.cancelAutosave();
                this.autosaveTask.cancelAll();
            }
            await this.autosaveTask.perform({leavingEditor: true, backgroundSave: false});
            return transition.retry();
        }

        // controller is dirty and we aren't in a new->edit or delete->index
        // transition so show our "are you sure you want to leave?" modal
        if (!this._leaveConfirmed && !fromNewToEdit && !deletedWithoutChanges && hasDirtyAttributes) {
            transition.abort();

            // if a save is running, wait for it to finish then transition
            if (this.saveTasks.isRunning) {
                await this.saveTasks.last;
                return transition.retry();
            }

            // if an autosave is scheduled, cancel it, save then transition
            if (this._autosaveRunning) {
                this.cancelAutosave();
                this.autosaveTask.cancelAll();

                // If leaving the editor, always save a revision
                await this.autosaveTask.perform({leavingEditor: true});
                return transition.retry();
            }

            // we genuinely have unsaved data, show the modal
            if (this.post) {
                Object.assign(this._leaveModalReason, {status: this.post.status});
            }
            console.log('showing leave editor modal', this._leaveModalReason); // eslint-disable-line

            const reallyLeave = await this.modals.open(ConfirmEditorLeaveModal);

            if (reallyLeave !== true) {
                return;
            } else {
                this._leaveConfirmed = true;
                transition.retry();
            }
        }

        // the transition is now certain to complete so cleanup and reset if
        // we're exiting the editor. new->edit keeps everything around and
        // edit->edit will call reset in the setPost method if necessary
        if (!fromNewToEdit && transition.targetName !== 'lexical-editor.edit') {
            this.reset();
        }
    }

    // called when the editor route is left or the post model is swapped
    reset() {
        let post = this.post;

        // make sure the save tasks aren't still running in the background
        // after leaving the edit route
        this.cancelAutosave();

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
        this._leaveConfirmed = false;

        this.set('post', null);
        this.set('hasDirtyAttributes', false);
        this.set('shouldFocusTitle', false);
        this.set('showSettingsMenu', false);
        this.set('wordCount', null);

        // remove the onbeforeunload handler as it's only relevant whilst on
        // the editor route
        window.onbeforeunload = null;
    }

    /* Private tasks ---------------------------------------------------------*/

    // save 3 seconds after the last edit
    @(task(function* () {
        if (!this._canAutosave) {
            return;
        }

        // force an instant save on first body edit for new posts
        if (this.get('post.isNew')) {
            return this.autosaveTask.perform();
        }

        yield timeout(AUTOSAVE_TIMEOUT);
        this.autosaveTask.perform();
    }).restartable())
        _autosaveTask;

    // save at 60 seconds even if the user doesn't stop typing
    @(task(function* () {
        if (!this._canAutosave) {
            return;
        }

        while (config.environment !== 'test' && true) {
            yield timeout(TIMEDSAVE_TIMEOUT);
            this.autosaveTask.perform();
        }
    }).drop())
        _timedSaveTask;

    // save at 10 minutes even if the post is already saved
    @(task(function* () {
        if (!this._canAutosave) {
            return;
        }

        while (config.environment !== 'test' && true) {
            yield timeout(REVISIONSAVE_TIMEOUT);
            this.autosaveTask.perform({
                saveRevision: this._canAutosave
            });
        }
    }).drop())
        _revisionSaveTask;

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
        if (post.titleScratch !== post.title) {
            this._leaveModalReason = {reason: 'title is different', context: {current: post.title, scratch: post.titleScratch}};
            return true;
        }

        // scratch isn't an attr so needs a manual dirty check
        let lexical = post.get('lexical');
        let scratch = post.get('lexicalScratch');
        // additional guard in case we are trying to compare null with undefined
        if (scratch || lexical) {
            if (scratch !== lexical) {
                this._leaveModalReason = {reason: 'lexical is different', context: {current: lexical, scratch}};
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
    }

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

        notifications.showNotification(message, {type: 'success', actions: (actions && htmlSafe(actions)), delayed});
    }

    async _showScheduledNotification(delayed) {
        let {
            publishedAtUTC,
            previewUrl,
            emailOnly,
            newsletter
        } = this.post;
        let publishedAtBlogTZ = moment.tz(publishedAtUTC, this.settings.timezone);

        let title = 'Scheduled';
        let description = emailOnly ? ['Will be sent'] : ['Will be published'];

        if (newsletter) {
            const recipientCount = await this.membersCountCache.countString(this.post.fullRecipientFilter, {newsletter});
            description.push(`${!emailOnly ? 'and delivered ' : ''}to <span><strong>${recipientCount}</strong></span>`);
        }

        description.push(`on <span><strong>${publishedAtBlogTZ.format('MMM Do')}</strong></span>`);
        description.push(`at <span><strong>${publishedAtBlogTZ.format('HH:mm')}</strong>`);
        if (publishedAtBlogTZ.utcOffset() === 0) {
            description.push('(UTC)</span>');
        } else {
            description.push(`(UTC${publishedAtBlogTZ.format('Z').replace(/([+-])0/, '$1').replace(/:00/, '')})</span>`);
        }

        description = htmlSafe(description.join(' '));

        let actions = htmlSafe(`<a href="${previewUrl}" target="_blank">View Preview</a>`);

        return this.notifications.showNotification(title, {description, actions, type: 'success', delayed});
    }

    _showErrorAlert(prevStatus, status, error, delay) {
        let message = messageMap.errors.post[prevStatus][status];
        let notifications = this.notifications;
        let errorMessage;

        function isString(str) {
            return toString.call(str) === '[object String]';
        }

        if (isServerUnreachableError(error)) {
            errorMessage = 'Unable to connect, please check your internet connection and try again';
        } else if (error && isString(error)) {
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
}
