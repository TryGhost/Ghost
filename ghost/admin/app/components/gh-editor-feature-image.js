import Component from '@glimmer/component';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

function hasParagraphWrapper(html) {
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(html, 'text/html');

    return doc.body?.firstElementChild?.tagName === 'P';
}

export default class GhEditorFeatureImageComponent extends Component {
    @service settings;

    @tracked isEditingAlt = false;
    @tracked captionInputFocused = false;
    @tracked showUnsplashSelector = false;
    @tracked canDrop = false;
    @tracked tkCount = 0;

    get caption() {
        const content = this.args.caption;
        if (!content) {
            return null;
        }
        // wrap in a paragraph, so it gets parsed correctly
        return hasParagraphWrapper(content) ? content : `<p>${content}</p>`;
    }

    @action
    setCaption(html) {
        const cleanedHtml = cleanBasicHtml(html || '', {firstChildInnerContent: true});
        this.args.updateCaption(cleanedHtml);
    }

    @action
    registerEditorAPI(API) {
        this.editorAPI = API;
    }

    @action
    focusCaptionEditor() {
        if (this.editorAPI) {
            this.editorAPI.focusEditor({position: 'bottom'});
        }
    }

    @action
    handleCaptionBlur() {
        this.captionInputFocused = false;
        this.args.handleCaptionBlur();
    }

    @action
    setUploadedImage(results) {
        if (results[0]) {
            this.args.updateImage(results[0].url);
        }
    }

    @action
    setUnsplashImage({src, caption}) {
        this.args.updateImage(src);
        this.args.updateCaption(caption);
    }

    @action
    toggleUnsplashSelector() {
        this.showUnsplashSelector = !this.showUnsplashSelector;
    }

    @action
    toggleAltEditing() {
        this.isEditingAlt = !this.isEditingAlt;
    }

    @action
    onAltInput(event) {
        this.args.updateAlt(event.target.value);
    }

    @action
    dragOver(event) {
        if (!event.dataTransfer.files) {
            return;
        }

        // this is needed to work around inconsistencies with dropping files
        // from Chrome's downloads bar
        if (navigator.userAgent.indexOf('Chrome') > -1) {
            let eA = event.dataTransfer.effectAllowed;
            event.dataTransfer.dropEffect = (eA === 'move' || eA === 'linkMove') ? 'move' : 'copy';
        }

        // event.stopPropagation();
        event.preventDefault();

        this.canDrop = true;
    }

    @action
    dragLeave(event) {
        if (!event.dataTransfer.files) {
            return;
        }

        event.preventDefault();
        this.canDrop = false;
    }

    @action
    drop(setFiles, event) {
        if (!event.dataTransfer.files) {
            return;
        }

        event.stopPropagation();
        event.preventDefault();

        this.canDrop = false;

        setFiles(event.dataTransfer.files);
    }

    @action
    saveImage(setFiles, imageFile) {
        this.canDrop = false;
        setFiles([imageFile]);
    }

    @action
    onTKCountChange(count) {
        if (this.args.onTKCountChange) {
            this.tkCount = count;
            this.args.onTKCountChange(count);
        }
    }
}
