import ModalComponent from 'ghost-admin/components/modal-base';
import diff from 'node-htmldiff';

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

    init() {
        this._super(...arguments);
        this.post = this.model;
    },

    didInsertElement() {
        this._super(...arguments);
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
    },

    get selectedRevision() {
        let revisions = this.post.get('postRevisions').toArray();
        // Revisions are in chronological order, and the last revision is the
        // the current post, so the second to last is the previous revision
        return revisions[revisions.length - 2];
    },

    get previousLexical() {
        return this.selectedRevision.get('lexical');
    },

    get currentLexical() {
        return this.post.get('lexical');
    },

    get previousTitle() {
        return this.selectedRevision.get('title') || this.post.get('title');
    },

    get currentTitle() {
        return this.post.get('title');
    },

    get cardConfig() {
        return {
            post: this.model
        };
    },

    get revisionList() {
        return this.post.get('postRevisions').toArray().reverse();
    }
    // get reversedPosts() {
    //     return this.post.toArray().reverse();
    // }
});
