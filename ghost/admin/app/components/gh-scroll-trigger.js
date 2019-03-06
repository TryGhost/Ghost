import Component from '@ember/component';
import InViewportMixin from 'ember-in-viewport';

export default Component.extend(InViewportMixin, {

    enter() {},
    exit() {},
    registerElement() {},

    didInsertElement() {
        let offset = this.triggerOffset || {};

        // if triggerOffset is a number we use it for all dimensions
        if (typeof offset === 'number') {
            offset = {
                top: offset,
                bottom: offset,
                left: offset,
                right: offset
            };
        }

        this.set('viewportSpy', true);
        this.set('viewportTolerance', {
            top: offset.top,
            bottom: offset.bottom,
            left: offset.left,
            right: offset.right
        });

        this._super(...arguments);

        this.registerElement(this.element);
    },

    didEnterViewport() {
        return this.enter();
    },

    didExitViewport() {
        return this.exit();
    }

});
