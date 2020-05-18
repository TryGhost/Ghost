import Component from '@ember/component';

export default Component.extend({
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
