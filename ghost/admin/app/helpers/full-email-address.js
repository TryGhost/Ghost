import Helper from '@ember/component/helper';
import {inject} from 'ghost-admin/decorators/inject';

export default class FullEmailAddressHelper extends Helper {
    @inject config;

    compute([email = '']) {
        if (email.indexOf('@') > -1) {
            return email;
        }

        return `${email}@${this.config.emailDomain}`;
    }
}
