import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class FullEmailAddressHelper extends Helper {
    @service config;

    compute([email = '']) {
        if (email.indexOf('@') > -1) {
            return email;
        }

        return `${email}@${this.config.emailDomain}`;
    }
}
