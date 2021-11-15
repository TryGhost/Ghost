import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhEditorFeatureImageComponent extends Component {
    @service settings;

    @tracked isEditingAlt = false;
    @tracked isHovered = false;
    @tracked captionInputFocused = false;
    @tracked showUnsplashSelector = false;
    @tracked canDrop = false;

    get hideButton() {
        return !this.canDrop && !this.isHovered && !this.args.forceButtonDisplay;
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
}
