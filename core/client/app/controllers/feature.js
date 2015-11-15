import Ember from 'ember';

const {Controller, PromiseProxyMixin, computed} = Ember;
const {alias} = computed;

export default Controller.extend(PromiseProxyMixin, {

    setting: alias('content'),

    labs: computed('isSettled', 'setting.labs', function () {
        let value = {};

        if (this.get('isFulfilled')) {
            try {
                value = JSON.parse(this.get('setting.labs') || {});
            } catch (err) {
                value = {};
            }
        }

        return value;
    }),

    publicAPI: computed('config.publicAPI', 'labs.publicAPI', function () {
        return this.get('config.publicAPI') || this.get('labs.publicAPI');
    }),

    init() {
        this._super(...arguments);

        let promise = this.store.query('setting', {type: 'blog,theme'}).then((settings) => {
            return settings.get('firstObject');
        });

        this.set('promise', promise);
    }
});
