import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

const FeatureFlagComponent = Component.extend({
    feature: service(),

    tagName: 'label',
    classNames: 'checkbox',
    attributeBindings: ['for'],
    _flagValue: null,

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
    }),

    init() {
        this._super(...arguments);

        this.set('_flagValue', this.get(`feature.${this.get('flag')}`));
    }
});

FeatureFlagComponent.reopenClass({
    positionalParams: ['flag']
});

export default FeatureFlagComponent;
