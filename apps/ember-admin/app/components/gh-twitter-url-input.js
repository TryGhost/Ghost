import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class GhTwitterUrlInput extends Component {
    get value() {
        const {model, modelProperty, scratchValue} = this.args;
        return scratchValue || model[modelProperty];
    }

    @action
    setScratchValue(event) {
        this.args.setScratchValue?.(event.target.value);
    }

    @action
    setTwitterUrl(event) {
        const {model, modelProperty} = this.args;

        const newUrl = event.target.value;

        // reset errors and validation
        model.errors.remove(modelProperty);
        model.hasValidated.removeObject(modelProperty);

        if (!newUrl) {
            // Clear out the Twitter url
            model[modelProperty] = '';
            this.args.setScratchValue?.(null);
            return;
        }

        if (newUrl.match(/(?:twitter\.com\/)(\S+)/) || newUrl.match(/([a-z\d.]+)/i)) {
            let username = [];

            if (newUrl.match(/(?:twitter\.com\/)(\S+)/)) {
                [, username] = newUrl.match(/(?:twitter\.com\/)(\S+)/);
            } else {
                [username] = newUrl.match(/([^/]+)\/?$/mi);
            }

            // check if username starts with http or www and show error if so
            if (username.match(/^(http|www)|(\/)/) || !username.match(/^[a-z\d._]{1,15}$/mi)) {
                const message = !username.match(/^[a-z\d._]{1,15}$/mi)
                    ? 'Your Username is not a valid Twitter Username'
                    : 'The URL must be in a format like https://twitter.com/yourUsername';

                model.errors.add(modelProperty, message);
                model.hasValidated.pushObject(modelProperty);
                return;
            }

            model[modelProperty] = `https://twitter.com/${username}`;
            this.args.setScratchValue?.(null);

            model.hasValidated.pushObject(modelProperty);
        } else {
            const message = 'The URL must be in a format like https://twitter.com/yourUsername';
            model.errors.add(modelProperty, message);
            model.hasValidated.pushObject(modelProperty);
            return;
        }
    }
}
