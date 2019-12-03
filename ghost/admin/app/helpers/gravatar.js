import Helper from '@ember/component/helper';
import md5 from 'blueimp-md5';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';

export default Helper.extend({
    config: service(),

    compute([email], {size = 180, d = 'blank'}/*, hash*/) {
        if (!this.get('config.useGravatar')) {
            return;
        }

        if (!email || isEmpty(email)) {
            return;
        }

        return `https://www.gravatar.com/avatar/${md5(email)}?s=${size}&d=${d}`;
    }
});
