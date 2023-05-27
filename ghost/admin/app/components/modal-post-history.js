import Component from '@glimmer/component';
import RestoreRevisionModal from '../components/modals/restore-revision';
import diff from 'node-htmldiff';
import {action, set} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

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
    @service feature;
    @service ghostPaths;
    @tracked selectedHTML = null;
    @tracked diffHtml = null;
    @tracked showDifferences = this.feature.get('postDiffing'); // should default to true in future
    @tracked selectedRevisionIndex = 0;

    constructor() {
        super(...arguments);
        this.post = this.args.model.post;
        this.editorAPI = this.args.model.editorAPI;
        this.toggleSettingsMenu = this.args.model.toggleSettingsMenu;
    }

    get selectedRevision() {
        return this.revisionList[this.selectedRevisionIndex];
    }

    get comparisonRevision() {
        return this.revisionList[this.selectedRevisionIndex + 1] || this.selectedRevision;
    }

    get previousTitle() {
        return this.comparisonRevision.title || this.post.get('title');
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
                feature_image: revision.get('featureImage'),
                feature_image_alt: revision.get('featureImageAlt'),
                feature_image_caption: revision.get('featureImageCaption'),
                author: {
                    name: revision.get('author.name') || 'Deleted staff user',
                    profile_image_url: revision.get('author.profileImage') || this.ghostPaths.assetRoot.replace(/\/$/, '') + '/img/user-image.png'
                },
                postStatus: revision.get('postStatus'),
                reason: revision.get('reason'),
                new_publish: revision.get('postStatus') === 'published' && revisions[index + 1]?.get('postStatus') === 'draft'
            };
        });
    }

    @action
    onInsert() {
        this.updateDiff();
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
    handleClick(index) {
        this.selectedRevisionIndex = index;
        this.updateDiff();
    }

    @action
    registerSelectedEditorApi(api) {
        this.selectedEditor = api;
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
            },
            closePostHistoryModal: () => {
                this.closeModal();
                this.toggleSettingsMenu();
            }
        });
    }

    @action
    toggleDifferences() {
        this.showDifferences = !this.showDifferences;
    }

    get cardConfig() {
        return {
            post: this.args.model
        };
    }

    calculateHTMLDiff(previousHTML, currentHTML) {
        const result = diff(previousHTML, currentHTML);
        const div = document.createElement('div');
        div.innerHTML = result;
        this.diffCards(div);
        return div.innerHTML;
    }

    diffCards(div) {
        const cards = div.querySelectorAll('div[data-kg-card]');
        for (const card of cards) {
            const hasChanges = !!card.querySelectorAll('del').length || !!card.querySelectorAll('ins').length;
            if (hasChanges) {
                const delCard = card.cloneNode(true);
                const insCard = card.cloneNode(true);

                const ins = document.createElement('ins');
                const del = document.createElement('del');

                delCard.querySelectorAll('ins').forEach((el) => {
                    el.remove();
                });
                insCard.querySelectorAll('del').forEach((el) => {
                    el.remove();
                });
                delCard.querySelectorAll('del').forEach((el) => {
                    el.parentNode.appendChild(el.firstChild);
                    el.remove();
                });
                insCard.querySelectorAll('ins').forEach((el) => {
                    el.parentNode.appendChild(el.firstChild);
                    el.remove();
                });

                ins.appendChild(insCard);
                del.appendChild(delCard);

                card.parentNode.appendChild(del);
                card.parentNode.appendChild(ins);
                card.remove();
            }
        }
    }

    updateDiff() {
        if (this.comparisonEditor && this.selectedEditor) {
            let comparisonState = this.comparisonEditor.editorInstance.parseEditorState(this.comparisonRevision.lexical);
            let selectedState = this.selectedEditor.editorInstance.parseEditorState(this.selectedRevision.lexical);

            this.comparisonEditor.editorInstance.setEditorState(comparisonState);
            this.selectedEditor.editorInstance.setEditorState(selectedState);
        }

        let previous = document.querySelector('.gh-post-history-hidden-lexical.previous');
        let current = document.querySelector('.gh-post-history-hidden-lexical.current');

        let previousDone = false;
        let currentDone = false;

        let updateIfBothDone = () => {
            if (previousDone && currentDone) {
                this.diffHtml = this.calculateHTMLDiff(this.stripInitialPlaceholder(previous.innerHTML), this.stripInitialPlaceholder(current.innerHTML));
                this.selectedHTML = this.stripInitialPlaceholder(current.innerHTML);
            }
        };

        checkFinishedRendering(previous, () => {
            previous.querySelectorAll('[contenteditable]').forEach((el) => {
                el.setAttribute('contenteditable', false);
            });
            previousDone = true;
            updateIfBothDone();
        });

        checkFinishedRendering(current, () => {
            current.querySelectorAll('[contenteditable]').forEach((el) => {
                el.setAttribute('contenteditable', false);
            });
            currentDone = true;
            updateIfBothDone();
        });
    }
}
