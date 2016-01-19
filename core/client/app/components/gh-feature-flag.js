import Ember from 'ember';

const {
    computed,
    inject: {service},
    Component,
    assert
} = Ember;

const FeatureFlagComponent = Component.extend({
    tagName: 'label',
    classNames: 'checkbox',
    attributeBindings: ['for'],

    feature: service(),

    flagValue: computed('flag', 'feature.isFulfilled', {
        get() {
            assert('The "flag" parameter must be set', this.get('flag'));
            return this.get(`feature.${this.get('flag')}`);
        },
        set(key, value) {
            assert('The "flag" parameter must be set', this.get('flag'));
            this.get('feature').set(this.get('flag'), value);
            return value;
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
