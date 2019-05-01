import Service from '@ember/service';

export default Service.extend({
    captionHasFocus: false,
    isDragging: false,

    captionGainedFocus(caption) {
        this._focusedCaption = caption;
        this.set('captionHasFocus', true);
    },

    captionLostFocus(caption) {
        if (this._focusedCaption === caption) {
            this._focusedCaption = null;
            this.set('captionHasFocus', false);
        }
    }
});
