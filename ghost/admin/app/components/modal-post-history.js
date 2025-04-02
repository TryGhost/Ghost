import Component from '@glimmer/component';
import RestoreRevisionModal from '../components/modals/restore-revision';
import {action, set} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';
import {waitFor} from '@ember/test-waiters';

function checkFinishedRendering(element, done) {
    let last = element.innerHTML;
    function check() {
        let html = element.innerHTML;
        if (html === last) {
            done();
        } else {
            last = html;
            setTimeout(check, 50);
        }
    }

    setTimeout(check, 50);
}

export default class ModalPostHistory extends Component {
    @service notifications;
    @service modals;
    @service ghostPaths;
    @tracked selectedHTML = null;
    @tracked selectedRevisionIndex = 0;

    constructor() {
        super(...arguments);
        this.post = this.args.model.post;
        this.editorAPI = this.args.model.editorAPI;
        this.secondaryEditorAPI = this.args.model.secondaryEditorAPI;
        this.toggleSettingsMenu = this.args.model.toggleSettingsMenu;
    }

    get selectedRevision() {
        return this.revisionList[this.selectedRevisionIndex];
    }

    get currentTitle() {
        return this.selectedRevision.title || this.post.get('title');
    }

    get revisionList() {
        const revisions = this.post.get('postRevisions').toArray().sort((a, b) => b.get('createdAt') - a.get('createdAt'));
        return revisions.map((revision, index) => {
            return {
                lexical: revision.get('lexical'),
                selected: index === this.selectedRevisionIndex,
                latest: index === 0,
                createdAt: revision.get('createdAt'),
                title: revision.get('title'),
                // custom_excerpt is a new field that was added to the post-revision model
                // that may not have been populated for older revisions. To cover that case
                // we revert to the current post's customExcerpt to avoid losing data when restoring.
                custom_excerpt: revision.get('customExcerpt') ?? this.post.customExcerpt,
                feature_image: revision.get('featureImage'),
                feature_image_alt: revision.get('featureImageAlt'),
                feature_image_caption: revision.get('featureImageCaption'),
                author: {
                    name: revision.get('author.name') || 'Deleted staff user',
                    profile_image_url: revision.get('author.profileImageUrl')
                },
                postStatus: revision.get('postStatus'),
                reason: revision.get('reason'),
                new_publish: revision.get('postStatus') === 'published' && revisions[index + 1]?.get('postStatus') === 'draft'
            };
        });
    }

    @action
    onInsert() {
        this.updateSelectedHTML();
        window.addEventListener('keydown', this.handleKeyDown);
    }

    @action
    willDestroy() {
        super.willDestroy(...arguments);
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    @action
    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.args.closeModal();
        }
    }

    @action
    @waitFor
    async handleClick(index) {
        this.selectedRevisionIndex = index;
        // async with @waitFor so tests will wait for the action to complete
        await this.updateSelectedHTML();
    }

    @action
    registerSelectedEditorApi(api) {
        this.selectedEditor = api;
    }

    @action
    registerSecondarySelectedEditorApi(api) {
        this.secondarySelectedEditor = api;
    }

    @action
    registerComparisonEditorApi(api) {
        this.comparisonEditor = api;
    }

    @action
    closeModal() {
        this.args.closeModal();
    }

    stripInitialPlaceholder(html) {
        //TODO: we should probably add a data attribute to Koenig and grab that instead
        const regex = /<div\b[^>]*>(\s*Begin writing your post\.\.\.\s*)<\/div>/i;
        const strippedHtml = html.replace(regex, '');
        return strippedHtml;
    }

    @action
    restoreRevision(index) {
        const revision = this.revisionList[index];
        this.modals.open(RestoreRevisionModal, {
            post: this.post,
            revision,
            updateTitle: () => {
                set(this.post, 'titleScratch', revision.title);
            },
            updateEditor: () => {
                const state = this.editorAPI.editorInstance.parseEditorState(revision.lexical);
                this.editorAPI.editorInstance.setEditorState(state);
                this.secondaryEditorAPI.editorInstance.setEditorState(state);
            },
            closePostHistoryModal: () => {
                this.closeModal();
                this.toggleSettingsMenu();
            }
        });
    }

    get cardConfig() {
        return {
            post: this.args.model
        };
    }

    updateSelectedHTML() {
        return new Promise((resolve) => {
            if (this.selectedEditor) {
                let selectedState = this.selectedEditor.editorInstance.parseEditorState(this.selectedRevision.lexical);

                this.selectedEditor.editorInstance.setEditorState(selectedState);
            }

            let current = document.querySelector('.gh-post-history-hidden-lexical.current');

            let currentDone = false;

            let updateIfDone = () => {
                if (currentDone) {
                    this.selectedHTML = this.stripInitialPlaceholder(current.innerHTML);
                }
                resolve();
            };

            checkFinishedRendering(current, () => {
                current.querySelectorAll('[contenteditable]').forEach((el) => {
                    el.setAttribute('contenteditable', false);
                });
                currentDone = true;
                updateIfDone();
            });
        });
    }
}
