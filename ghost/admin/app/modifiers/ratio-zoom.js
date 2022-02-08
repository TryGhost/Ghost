import Modifier from 'ember-modifier';
import {bind, throttle} from '@ember/runloop';

export default class RatioZoom extends Modifier {
    resizeHandler = null;

    didReceiveArguments() {
        const {zoomed} = this.args.named;

        if (zoomed) {
            this.setZoomedSize();
        }
    }

    willDestroy() {
        this.removeResizeEventListener();
    }

    setZoomedSize() {
        const {ratio} = this.args.named;

        this.element.style.width = '100%';
        this.element.style.height = '100%';

        const offsets = this.element.getBoundingClientRect();

        let maxHeight = {
            width: offsets.height / ratio,
            height: offsets.height
        };

        let maxWidth = {
            width: offsets.width,
            height: offsets.width * ratio
        };

        let usableSize = null;

        if (ratio <= 1) {
            usableSize = maxWidth.height > offsets.height ? maxHeight : maxWidth;
        } else {
            usableSize = maxHeight.width > offsets.width ? maxWidth : maxHeight;
        }

        this.element.style.width = `${usableSize.width}px`;
        this.element.style.height = `${usableSize.height}px`;

        this.addResizeEventListener();
    }

    handleResize() {
        throttle(this, this.setZoomedSize, 100);
    }

    addResizeEventListener() {
        if (!this.resizeHandler) {
            this.resizeHandler = bind(this, this.handleResize);
            window.addEventListener('resize', this.resizeHandler);
        }
    }

    removeResizeEventListener() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    }
}
