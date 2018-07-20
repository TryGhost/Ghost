import Component from '@ember/component';
import layout from '../templates/components/koenig-card-hr';

export default Component.extend({
    layout,
    tagName: '',

    // closure actions
    selectCard() {},
    deselectCard() {},
    registerComponent() {},

    init() {
        this._super(...arguments);
        this.registerComponent(this);
    }
});
