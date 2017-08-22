import Component from '@ember/component';
import InViewportMixin from 'ember-in-viewport';

export default Component.extend(InViewportMixin, {

    onEnterViewport() {},

    didInsertElement() {
        let offset = this.get('triggerOffset');

        this.set('viewportSpy', true);
        this.set('viewportTolerance', {
            top: offset,
            bottom: offset,
            left: offset,
            right: offset
        });

        this._super(...arguments);
    },

    didEnterViewport() {
        return this.onEnterViewport();
    }

});
