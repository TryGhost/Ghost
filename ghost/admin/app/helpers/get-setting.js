import Helper from '@ember/component/helper';
import {get} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GetSetting extends Helper {
    @service settings;

    compute([key = '']) {
        return get(this.settings, key);
    }
}
