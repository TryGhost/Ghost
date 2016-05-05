import Ember from 'ember';

const {
    computed,
    inject: {service},
    Component
} = Ember;

const FeatureFlagComponent = Component.extend({
    tagName: 'label',
    classNames: 'checkbox',
    attributeBindings: ['for'],
    _flagValue: null,

    feature: service(),

    init() {
        this._super(...arguments);

        this.set('_flagValue', this.get(`feature.${this.get('flag')}`));
    },

    value: computed('_flagValue', {
        get() {
            return this.get('_flagValue');
        },
        set(key, value) {
            return this.set(`feature.${this.get('flag')}`, value);
        }
    }),

    for: computed('flag', function () {
        return `labs-${this.get('flag')}`;
    }),

    name: computed('flag', function () {
        return `labs[${this.get('flag')}]`;
    })
});

FeatureFlagComponent.reopenClass({
    positionalParams: ['flag']
});

export default FeatureFlagComponent;
