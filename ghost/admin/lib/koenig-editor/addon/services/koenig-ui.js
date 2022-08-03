import Service from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class KoenigUiService extends Service {
    @tracked captionHasFocus = false;
    @tracked inputHasFocus = false;
    @tracked isDragging = false;

    #focusedCaption = null;

    captionGainedFocus(caption) {
        this.captionHasFocus = true;
        this.#focusedCaption = caption;
    }

    captionLostFocus(caption) {
        if (this.#focusedCaption === caption) {
            this.captionHasFocus = false;
            this.#focusedCaption = null;
        }
    }
}
