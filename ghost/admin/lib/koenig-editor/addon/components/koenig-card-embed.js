import Component from '@ember/component';
import layout from '../templates/components/koenig-card-embed';
import {NO_CURSOR_MOVEMENT} from './koenig-editor';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {task} from 'ember-concurrency';

export default Component.extend({
    ajax: service(),
    ghostPaths: service(),

    layout,

    // attrs
    payload: null,
    isSelected: false,
    isEditing: false,

    // internal properties
    hasError: false,

    // closure actions
    selectCard() {},
    deselectCard() {},
    editCard() {},
    saveCard() {},
    deleteCard() {},
    moveCursorToNextSection() {},
    moveCursorToPrevSection() {},
    addParagraphAfterCard() {},

    init() {
        this._super(...arguments);
        if (this.payload.url && !this.payload.html) {
            this.convertUrl.perform(this.payload.url);
        }
    },

    didInsertElement() {
        this._super(...arguments);
        this._loadPayloadScript();
    },

    actions: {
        onDeselect() {
            if (this.payload.url && !this.payload.html && !this.hasError) {
                this.convertUrl.perform(this.payload.url);
            } else {
                this._deleteIfEmpty();
            }
        },

        updateUrl(event) {
            let url = event.target.value;
            set(this.payload, 'url', url);
        },

        urlKeydown(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.convertUrl.perform(this.payload.url);
            }

            if (event.key === 'Escape') {
                this.deleteCard();
            }
        },

        updateCaption(caption) {
            set(this.payload, 'caption', caption);
            this.saveCard(this.payload, false);
        },

        retry() {
            this.set('hasError', false);
        },

        insertAsLink() {
            this.editor.run((postEditor) => {
                let {builder} = postEditor;
                let cardSection = this.env.postModel;
                let p = builder.createMarkupSection('p');
                let link = builder.createMarkup('a', {href: this.payload.url});

                postEditor.replaceSection(cardSection, p);
                postEditor.insertTextWithMarkup(p.toRange().head, this.payload.url, [link]);
            });
        }
    },

    convertUrl: task(function* (url) {
        if (isBlank(url)) {
            this.deleteCard();
            return;
        }

        try {
            let oembedEndpoint = this.ghostPaths.url.api('oembed');
            let response = yield this.ajax.request(oembedEndpoint, {
                data: {
                    url
                }
            });

            if (!response.html) {
                throw 'No HTML returned';
            }

            set(this.payload, 'html', response.html);
            set(this.payload, 'type', response.type);
            this.saveCard(this.payload, false);

            run.schedule('afterRender', this, this._loadPayloadScript);
        } catch (err) {
            this.set('hasError', true);
        }
    }),

    // some oembeds will have a script tag but it won't automatically run
    // due to the way Ember renders the card components. Grab the script
    // element and push a new one to force the browser to download+run it
    _loadPayloadScript() {
        let oldScript = this.element.querySelector('script');
        if (oldScript) {
            let parent = oldScript.parentElement;
            let newScript = document.createElement('script');
            newScript.type = 'text/javascript';

            if (oldScript.src) {
                // hide the original embed html to avoid ugly transitions as the
                // script runs (at least on reasonably good network and cpu)
                let embedElement = this.element.querySelector('[data-kg-embed]');
                embedElement.style.display = 'none';

                newScript.src = oldScript.src;

                // once the script has loaded, wait a little while for it to do it's
                // thing before making everything visible again
                newScript.onload = run.bind(this, function () {
                    run.later(this, function () {
                        embedElement.style.display = null;
                    }, 500);
                });

                newScript.onerror = run.bind(this, function () {
                    embedElement.style.display = null;
                });
            } else {
                newScript.innerHTML = oldScript.innerHTML;
            }

            oldScript.remove();
            parent.appendChild(newScript);
        }
    },

    _deleteIfEmpty() {
        if (isBlank(this.payload.html) && !this.convertUrl.isRunning && !this.hasError) {
            this.deleteCard(NO_CURSOR_MOVEMENT);
        }
    }
});
