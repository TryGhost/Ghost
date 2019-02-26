import Component from '@ember/component';
import {computed, defineProperty} from '@ember/object';
import {readOnly} from '@ember/object/computed';
import {inject as service} from '@ember/service';

const FeatureFlagComponent = Component.extend({
    feature: service(),

    tagName: 'label',
    classNames: 'checkbox',
    attributeBindings: ['for', 'disabled'],
    disabled: computed('_disabled', function () {
        if (this.get('_disabled')) {
            return true;
        }
        return false;
    }),
    value: computed('_flagValue', {
        get() {
            return this.get('_flagValue');
        },
        set(key, value) {
            if (this.get('flag') === 'members' && value === true) {
                this.set(`feature.subscribers`, false);
            }
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

        defineProperty(this, '_flagValue', readOnly(`feature.${this.get('flag')}`), function () {
            return this.get(`feature.${this.get('flag')}`);
        });
    }
});

FeatureFlagComponent.reopenClass({
    positionalParams: ['flag', '_disabled']
});

export default FeatureFlagComponent;
