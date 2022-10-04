import Component from '@glimmer/component';
import validator from 'validator';
import {action} from '@ember/object';
import {get, set} from '@ember/object';

export default class GhFacebookUrlInput extends Component {
    // NOTE: `get` and `set` are required when reading/writing model properties
    // because we can be dealing with proxy objects such as the settings service
    get value() {
        const {model, modelProperty, scratchValue} = this.args;
        return scratchValue || get(model, modelProperty);
    }

    @action
    setScratchValue(event) {
        this.args.setScratchValue?.(event.target.value);
    }

    @action
    setFacebookUrl(event) {
        const {model, modelProperty} = this.args;

        let newUrl = event.target.value;

        // reset errors and validation
        model.errors.remove('facebook');
        model.hasValidated.removeObject('facebook');

        if (!newUrl) {
            // Clear out the Facebook url
            set(model, modelProperty, null);
            this.args.setScratchValue?.(null);
            return;
        }

        try {
            // strip any facebook URLs out
            newUrl = newUrl.replace(/(https?:\/\/)?(www\.)?facebook\.com/i, '');

            // don't allow any non-facebook urls
            if (newUrl.match(/^(http|\/\/)/i)) {
                throw 'invalid url';
            }

            // strip leading / if we have one then concat to full facebook URL
            newUrl = newUrl.replace(/^\//, '');
            newUrl = `https://www.facebook.com/${newUrl}`;

            // don't allow URL if it's not valid
            if (!validator.isURL(newUrl)) {
                throw 'invalid url';
            }

            set(model, modelProperty, newUrl);
            this.args.setScratchValue?.(null);
        } catch (e) {
            if (e === 'invalid url') {
                const message = 'The URL must be in a format like https://www.facebook.com/yourPage';
                model.errors.add('facebook', message);
                return;
            }

            throw e;
        } finally {
            model.hasValidated.pushObject('facebook');
        }
    }
}
