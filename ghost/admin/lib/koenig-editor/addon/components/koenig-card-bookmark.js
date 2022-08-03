import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {NO_CURSOR_MOVEMENT} from './koenig-editor';
import {action, computed, set} from '@ember/object';
import {utils as ghostHelperUtils} from '@tryghost/helpers';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const {countWords} = ghostHelperUtils;

@classic
export default class KoenigCardBookmark extends Component {
    @service ajax;
    @service ghostPaths;

    // attrs
    payload = null;
    isSelected = false;
    isEditing = false;

    // internal properties
    hasError = false;

    // closure actions
    selectCard() {}
    deselectCard() {}
    editCard() {}
    saveCard() {}
    deleteCard() {}
    moveCursorToNextSection() {}
    moveCursorToPrevSection() {}
    addParagraphAfterCard() {}
    registerComponent() {}

    @computed('payload.metadata')
    get isEmpty() {
        return isBlank(this.payload.metadata);
    }

    @computed('payload.{metadata,caption}')
    get counts() {
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
    }

    init() {
        super.init(...arguments);
        if (this.payload.url && !this.payload.metadata) {
            this.convertUrl.perform(this.payload.url);
        }

        this.registerComponent(this);
    }

    didInsertElement() {
        super.didInsertElement(...arguments);
        this._focusInput();
    }

    @action
    onDeselect() {
        if (this.payload.url && !this.payload.metadata && !this.hasError) {
            this.convertUrl.perform(this.payload.url);
        } else {
            if (this.isEmpty && !this.convertUrl.isRunning && !this.hasError) {
                this.deleteCard(NO_CURSOR_MOVEMENT);
            }
        }
    }

    @action
    updateUrl(event) {
        let url = event.target.value;
        set(this.payload, 'url', url);
    }

    @action
    urlKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.convertUrl.perform(this.payload.url);
        }

        if (event.key === 'Escape') {
            event.target.blur();
            this.deleteCard();
        }
    }

    @action
    updateCaption(caption) {
        set(this.payload, 'caption', caption);
        this.saveCard(this.payload, false);
    }

    @action
    retry() {
        this.set('errorMessage', null);
        this.set('hasError', false);
    }

    @action
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

    @(task(function* (url) {
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
            this.saveCard(this.payload, false);
        } catch (err) {
            if (this.payload.linkOnError) {
                this.send('insertAsLink', {linkOnError: true});
                return;
            }

            if (err.payload.errors && err.payload.errors[0]) {
                let [firstError] = err.payload.errors;
                let errorMessage = firstError.context || firstError.message;
                errorMessage = errorMessage.replace(url, '').trim();
                this.set('errorMessage', errorMessage);
            }

            this.set('hasError', true);
        }
    }).drop())
        convertUrl;

    _focusInput() {
        let urlInput = this.element.querySelector('[name="url"]');

        if (urlInput) {
            urlInput.focus();
        }
    }
}
