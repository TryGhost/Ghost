import ModalComponent from 'ghost-admin/components/modal-base';
import diff from 'node-htmldiff';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';

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

export default ModalComponent.extend({
    notifications: service(),
    selectedHTML: null,
    diffHtml: null,
    showDifferences: true,
    selectedRevisionIndex: 0,

    selectedRevision: computed('selectedRevisionIndex', 'revisionList.[]', function () {
        return this.revisionList[this.selectedRevisionIndex];
    }),

    comparisonRevision: computed('selectedRevisionIndex', 'revisionList.[]', function () {
        return this.revisionList[this.selectedRevisionIndex + 1] || this.selectedRevision;
    }),

    previousTitle: computed('comparisonRevision.title', 'post.title', function () {
        return this.comparisonRevision.title || this.post.get('title');
    }),

    currentTitle: computed('selectedRevision.title', 'post.title', function () {
        return this.selectedRevision.title || this.post.get('title');
    }),

    revisionList: computed('post.postRevisions.[]', 'selectedRevisionIndex', function () {
        return this.post.get('postRevisions').toArray().reverse().map((revision, index) => {
            return {
                lexical: revision.get('lexical'),
                selected: index === this.selectedRevisionIndex,
                latest: index === 0,
                createdAt: revision.get('createdAt'),
                title: revision.get('title'),
                author: {
                    name: revision.get('author.name')
                }
            };
        });
    }),

    init() {
        this._super(...arguments);
        this.post = this.model.post;
        this.editorAPI = this.model.editorAPI;
    },

    didInsertElement() {
        this._super(...arguments);
        this.updateDiff();
    },

    actions: {
        handleClick(index) {
            this.set('selectedRevisionIndex', index);
            this.updateDiff();
        },

        registerSelectedEditorApi(api) {
            this.selectedEditor = api;
        },

        registerComparisonEditorApi(api) {
            this.comparisonEditor = api;
        }
    },

    stripInitialPlaceholder(html) {
        //TODO: we should probably add a data attribute to Koenig and grab that instead
        const regex = /<div\b[^>]*>(\s*Begin writing your post\.\.\.\s*)<\/div>/i;
        const strippedHtml = html.replace(regex, '');
        return strippedHtml;
    },

    restoreRevision: action(function (index){
        const revision = this.revisionList[index];

        // Persist model
        this.post.lexical = revision.lexical;
        this.post.title = revision.title;
        this.post.save();

        // @TODO: error handling

        // Update editor title
        this.set('post.titleScratch', this.post.title);

        // Update editor content
        const state = this.editorAPI.editorInstance.parseEditorState(this.post.lexical);
        this.editorAPI.editorInstance.setEditorState(state);

        // Close modal
        this.closeModal();
        this.notifications.showNotification('Revision successfully restored.', {type: 'success'});
    }),

    toggleDifferences: action(function () {
        this.toggleProperty('showDifferences');
    }),

    get cardConfig() {
        return {
            post: this.model
        };
    },

    calculateHTMLDiff(previousHTML, currentHTML) {
        const result = diff(previousHTML, currentHTML);
        const div = document.createElement('div');
        div.innerHTML = result;
        this.diffCards(div);
        return div.innerHTML;
    },

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
    },

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
                this.set('diffHtml', this.calculateHTMLDiff(this.stripInitialPlaceholder(previous.innerHTML), this.stripInitialPlaceholder(current.innerHTML)));
                this.set('selectedHTML', this.stripInitialPlaceholder(current.innerHTML));
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
});
