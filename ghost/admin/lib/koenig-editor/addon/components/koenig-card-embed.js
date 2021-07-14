/* global noframe */
import Component from '@ember/component';
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

    counts: computed('payload.{html,caption}', function () {
        return {
            imageCount: this.payload.html ? 1 : 0,
            wordCount: countWords(this.payload.caption)
        };
    }),

    init() {
        this._super(...arguments);
        if (this.payload.url && !this.payload.html) {
            this.convertUrl.perform(this.payload.url);
        }

        this.registerComponent(this);
    },

    didInsertElement() {
        this._super(...arguments);
        this._populateIframe();
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
        },

        insertAsBookmark(payload) {
            let {range} = this.editor;

            this.editor.run((postEditor) => {
                let cardSection = this.env.postModel;
                let bookmarkCard = postEditor.builder.createCardSection('bookmark', payload);

                postEditor.replaceSection(cardSection, bookmarkCard);

                // if a user is typing further on in the doc (possible if embed
                // was created automatically via paste of URL) then return the
                // cursor so the card->link change doesn't cause a cursor jump
                if (range.headSection !== cardSection) {
                    postEditor.setRange(range);
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
            let requestData = {
                url
            };
            if (!this.payload.isDirectUrl) {
                requestData.type = 'embed';
            }
            let response = yield this.ajax.request(oembedEndpoint, {
                data: requestData
            });
            if (response.type === 'bookmark') {
                this.send('insertAsBookmark', response);
                return;
            }
            if (!response.html) {
                throw 'No HTML returned';
            }

            set(this.payload, 'linkOnError', undefined);
            set(this.payload, 'isDirectUrl', undefined);

            set(this.payload, 'html', response.html);
            delete response.html;
            set(this.payload, 'type', response.type);
            delete response.type;
            // store all other data returned from oembed such as thumbnails, sizing, etc
            set(this.payload, 'metadata', response);

            this.saveCard(this.payload, false);

            run.schedule('afterRender', this, this._populateIframe);
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

    _populateIframe() {
        let iframe = this.element.querySelector('iframe');
        if (iframe) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(this.payload.html);
            iframe.contentWindow.document.close();

            iframe.contentDocument.body.style.display = 'flex';
            iframe.contentDocument.body.style.margin = '0';
            iframe.contentDocument.body.style.justifyContent = 'center';

            let nestedIframe = iframe.contentDocument.body.firstChild;
            if (nestedIframe.nodeName === 'IFRAME') {
                noframe(nestedIframe, '[data-kg-embed]');
                this._resizeIframe(iframe);
            }

            this._iframeResizeHandler = run.bind(this, this._resizeIframe, iframe);
            this._iframeMutationObserver = this._createMutationObserver(
                iframe.contentWindow.document,
                this._iframeResizeHandler
            );

            this._setupWindowResizeHandler(iframe);
        }
    },

    _createMutationObserver(target, callback) {
        function addImageLoadListeners(mutation) {
            function addImageLoadListener(element) {
                if (element.complete === false) {
                    element.addEventListener('load', imageEventTriggered, false);
                    element.addEventListener('error', imageEventTriggered, false);
                    imageElements.push(element);
                }
            }

            if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                addImageLoadListener(mutation.target);
            } else if (mutation.type === 'childList') {
                Array.prototype.forEach.call(
                    mutation.target.querySelectorAll('img'),
                    addImageLoadListener
                );
            }
        }

        function removeFromElements(element) {
            imageElements.splice(imageElements.indexOf(element), 1);
        }

        function removeImageLoadListener(element) {
            element.removeEventListener('load', imageEventTriggered, false);
            element.removeEventListener('error', imageEventTriggered, false);
            removeFromElements(element);
        }

        function imageEventTriggered(event) {
            removeImageLoadListener(event.target);
            callback();
        }

        function mutationObserved(mutations) {
            callback();

            // deal with async image loads when tags are injected into the page
            mutations.forEach(addImageLoadListeners);
        }

        function createMutationObserver(mutationTarget) {
            let config = {
                attributes: true,
                attributeOldValue: false,
                characterData: true,
                characterDataOldValue: false,
                childList: true,
                subtree: true
            };

            let observer = new MutationObserver(mutationObserved);
            observer.observe(mutationTarget, config); // eslint-disable-line ghost/ember/no-observers
            return observer;
        }

        let imageElements = [];
        let observer = createMutationObserver(target);

        return {
            disconnect() {
                if ('disconnect' in observer) {
                    observer.disconnect(); // eslint-disable-line ghost/ember/no-observers
                    imageElements.forEach(removeImageLoadListener);
                }
            }
        };
    },

    _resizeIframe(iframe) {
        this._resizeDebounce = run.debounce(this, this.__debouncedResizeIframe, iframe, 66);
    },

    __debouncedResizeIframe(iframe) {
        iframe.style.height = null;

        // get ratio from nested iframe if present (eg, Vimeo)
        let firstElement = iframe.contentDocument.body.firstChild;
        if (firstElement.tagName === 'IFRAME') {
            let width = parseInt(firstElement.getAttribute('width'));
            let height = parseInt(firstElement.getAttribute('height'));
            if (width && height) {
                let ratio = width / height;
                let newHeight = iframe.offsetWidth / ratio;
                firstElement.style.height = `${newHeight}px`;
                iframe.style.height = `${newHeight}px`;
                return;
            }
        }

        // otherwise use iframes internal height (eg, Instagram)
        let height = iframe.contentDocument.scrollingElement.scrollHeight;
        iframe.style.height = `${height}px`;
    },

    _setupWindowResizeHandler(iframe) {
        window.removeEventListener('resize', this._windowResizeHandler);
        this._windowResizeHandler = run.bind(this, this._resizeIframe, iframe);
        window.addEventListener('resize', this._windowResizeHandler, {passive: true});
    },

    _deleteIfEmpty() {
        if (isBlank(this.payload.html) && !this.convertUrl.isRunning && !this.hasError) {
            this.deleteCard(NO_CURSOR_MOVEMENT);
        }
    }
});
