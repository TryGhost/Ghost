import Component from '@ember/component';

export default Component.extend({
    tagName: '',

    init() {
        this._super(...arguments);
        this.registerComponent(this);
    }
});
