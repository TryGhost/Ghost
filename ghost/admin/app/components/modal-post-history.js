import ModalComponent from 'ghost-admin/components/modal-base';
import diff from 'node-htmldiff';
import {computed} from '@ember/object';

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
    diffHtml: null,

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

    init() {
        this._super(...arguments);
        this.post = this.model;
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

    get cardConfig() {
        return {
            post: this.model
        };
    },

    get revisionList() {
        return this.post.get('postRevisions').toArray().reverse().map((revision, index) => {
            return {
                lexical: revision.get('lexical'),
                selected: index === this.selectedRevisionIndex,
                createdAt: revision.get('createdAt'),
                title: revision.get('title'),
                author: {
                    name: revision.get('author.name')
                }
            };
        });
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
                this.set('diffHtml', diff(previous.innerHTML, current.innerHTML));
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
