import Modifier from 'ember-modifier';
import {bind, throttle} from '@ember/runloop';
import {registerDestructor} from '@ember/destroyable';

export default class RatioZoom extends Modifier {
    element = null;
    ratio = 1;
    resizeHandler = null;

    constructor(owner, args) {
        super(owner, args);
        registerDestructor(this, this.cleanup);
    }

    modify(element, positional, {zoomed, ratio}) {
        this.element = element;
        this.ratio = ratio;

        if (zoomed) {
            this.setZoomedSize();
        }
    }

    cleanup = () => {
        this.removeResizeEventListener();
    };

    setZoomedSize() {
        const {element, ratio} = this;

        element.style.width = '100%';
        element.style.height = '100%';

        const offsets = element.getBoundingClientRect();

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

        element.style.width = `${usableSize.width}px`;
        element.style.height = `${usableSize.height}px`;

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
