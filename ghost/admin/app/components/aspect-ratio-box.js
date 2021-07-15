import Component from '@ember/component';
import {assert} from '@ember/debug';
import {debounce, run} from '@ember/runloop';

export default Component.extend({
    ratio: '1/1',
    base: 'height',
    isResizing: true,

    _ratio: 1,

    init() {
        this._super(...arguments);
        this._onResizeHandler = () => {
            debounce(this, this._resize, 200);
        };
    },

    didReceiveAttrs() {
        this._super(...arguments);
        assert(
            '{{aspect-ratio-box}} requires a `ratio` property in the format `"16/9"`',
            this.ratio.match(/\d+\/\d+/)
        );
        this._ratio = this.ratio.split('/').reduce((prev, curr) => prev / curr);
    },

    didInsertElement() {
        this._super(...arguments);
        this._resize();
        window.addEventListener('resize', this._onResizeHandler);
    },

    willDestroyElement() {
        this._super(...arguments);
        window.removeEventListener('resize', this._onResizeHandler);
    },

    _resize() {
        this.set('isResizing', true);

        run.schedule('afterRender', this, function () {
            if (this.base === 'height') {
                this.element.style.width = `${this.element.clientHeight * this._ratio}px`;
            } else {
                this.element.style.height = `${this.element.clientWidth * this._ratio}px`;
            }

            this.set('isResizing', false);
        });
    }

});
