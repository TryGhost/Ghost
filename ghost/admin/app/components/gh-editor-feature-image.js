import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class GhEditorFeatureImageComponent extends Component {
    @tracked isEditingAlt = false;
    @tracked isHovered = false;
    @tracked captionInputFocused = false;
    @tracked showUnsplashSelector = false;

    get hideButton() {
        return !this.isHovered && !this.args.forceButtonDisplay;
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
}
