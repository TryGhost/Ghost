import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {attributeBindings, classNames, tagName} from '@ember-decorators/component';
import {computed, defineProperty} from '@ember/object';
import {readOnly} from '@ember/object/computed';
import {inject as service} from '@ember/service';

@classic
@tagName('label')
@classNames('switch')
@attributeBindings('for', 'disabled')
class FeatureFlagComponent extends Component {
    @service feature;

    @computed('_disabled')
    get disabled() {
        if (this._disabled) {
            return true;
        }
        return false;
    }

    @computed('_flagValue')
    get value() {
        return this._flagValue;
    }

    set value(value) {
        this.set(`feature.${this.flag}`, value);
    }

    @computed('flag')
    get for() {
        return `labs-${this.flag}`;
    }

    @computed('flag')
    get name() {
        return `labs[${this.flag}]`;
    }

    init() {
        super.init(...arguments);

        defineProperty(this, '_flagValue', readOnly(`feature.${this.flag}`), function () {
            return this.get(`feature.${this.flag}`);
        });
    }
}

export default FeatureFlagComponent;
