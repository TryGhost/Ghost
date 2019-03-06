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
        if (this._disabled) {
            return true;
        }
        return false;
    }),
    value: computed('_flagValue', {
        get() {
            return this._flagValue;
        },
        set(key, value) {
            if (this.flag === 'members' && value === true) {
                this.set(`feature.subscribers`, false);
            }
            return this.set(`feature.${this.flag}`, value);
        }
    }),

    for: computed('flag', function () {
        return `labs-${this.flag}`;
    }),

    name: computed('flag', function () {
        return `labs[${this.flag}]`;
    }),

    init() {
        this._super(...arguments);

        defineProperty(this, '_flagValue', readOnly(`feature.${this.flag}`), function () {
            return this.get(`feature.${this.flag}`);
        });
    }
});

FeatureFlagComponent.reopenClass({
    positionalParams: ['flag', '_disabled']
});

export default FeatureFlagComponent;
