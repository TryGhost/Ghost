import Component from '@ember/component';
import layout from '../templates/components/koenig-card-bookmark';
import {NO_CURSOR_MOVEMENT} from './koenig-editor';
import {computed} from '@ember/object';
import {utils as ghostHelperUtils} from '@tryghost/helpers';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {task} from 'ember-concurrency';

const {countWords} = ghostHelperUtils;

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
    registerComponent() {},

    counts: computed('payload.{metadata,caption}', function () {
        let imgCount = 0;
        let wordCount = 0;
        let metadata = this.payload.metadata;
        let caption = this.payload.caption;
        imgCount = (metadata && metadata.icon) ? (imgCount + 1) : imgCount;
        imgCount = (metadata && metadata.thumbnail) ? (imgCount + 1) : imgCount;
        let metadataWordCount = metadata ? (countWords(this.payload.metadata.title) + countWords(this.payload.metadata.description)) : 0;
        wordCount = countWords(caption) + metadataWordCount;
        return {
            imageCount: imgCount,
            wordCount: wordCount
        };
    }),

    init() {
        this._super(...arguments);
        if (this.payload.url && !this.payload.metadata) {
            this.convertUrl.perform(this.payload.url);
        }

        this.registerComponent(this);
    },

    didInsertElement() {
        this._super(...arguments);
        this._focusInput();
    },

    willDestroyElement() {
        this._super(...arguments);

        run.cancel(this._resizeDebounce);

        if (this._iframeMutationObserver) {
            this._iframeMutationObserver.disconnect();
        }

        window.removeEventListener('resize', this._windowResizeHandler);
    },

    actions: {
        onDeselect() {
            if (this.payload.url && !this.payload.metadata && !this.hasError) {
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
                event.target.blur();
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

        insertAsLink(options = {linkOnError: false}) {
            let {range} = this.editor;

            this.editor.run((postEditor) => {
                let {builder} = postEditor;
                let cardSection = this.env.postModel;
                let p = builder.createMarkupSection('p');
                let link = builder.createMarkup('a', {href: this.payload.url});

                postEditor.replaceSection(cardSection, p);
                postEditor.insertTextWithMarkup(p.toRange().head, this.payload.url, [link]);

                // if a user is typing further on in the doc (possible if embed
                // was created automatically via paste of URL) then return the
                // cursor so the card->link change doesn't cause a cursor jump
                if (range.headSection !== cardSection) {
                    postEditor.setRange(range);
                }

                // avoid adding an extra undo step when automatically creating
                // link after an error so that an Undo after pasting a URL
                // doesn't get stuck in a loop going through link->embed->link
                if (options.linkOnError) {
                    postEditor.cancelSnapshot();
                }
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
                    url,
                    type: 'bookmark'
                }
            });

            if (!response.metadata) {
                throw 'No metadata returned';
            }

            set(this.payload, 'linkOnError', undefined);
            set(this.payload, 'metadata', response.metadata);
            set(this.payload, 'type', response.type);
            this.saveCard(this.payload, false);
        } catch (err) {
            if (this.payload.linkOnError) {
                this.send('insertAsLink', {linkOnError: true});
                return;
            }
            this.set('hasError', true);
        }
    }),

    _focusInput() {
        let urlInput = this.element.querySelector('[name="url"]');

        if (urlInput) {
            urlInput.focus();
        }
    },

    _deleteIfEmpty() {
        if (isBlank(this.payload.metadata) && !this.convertUrl.isRunning && !this.hasError) {
            this.deleteCard(NO_CURSOR_MOVEMENT);
        }
    }
});
