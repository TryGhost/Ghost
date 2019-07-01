import Component from '@ember/component';
import {run} from '@ember/runloop';

export default Component.extend({
    tagName: '',

    actions: {
        initScrollWatch(element) {
            this._onScroll = run.bind(this, this.onScroll, element);
            this._scrollContainer = element.closest('.gh-main');
            if (this._scrollContainer) {
                this._scrollContainer.addEventListener('scroll', this._onScroll, {passive: true});
            }
        },

        clearScrollWatch() {
            if (this._scrollContainer) {
                this._scrollContainer.removeEventListener('scroll', this._onScroll);
            }
        }
    },

    onScroll(element) {
        if (this._isSticky && this._scrollContainer.scrollTop < 10) {
            element.classList.remove('gh-canvas-header--sticky');
            this._isSticky = false;
        } else if (!this._isSticky && this._scrollContainer.scrollTop > 10) {
            element.classList.add('gh-canvas-header--sticky');
            this._isSticky = true;
        }
    }
});
