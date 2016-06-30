import Component from 'ember-component';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';

const FeatureFlagComponent = Component.extend({
    tagName: 'label',
    classNames: 'checkbox',
    attributeBindings: ['for'],
    _flagValue: null,

    feature: injectService(),

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
