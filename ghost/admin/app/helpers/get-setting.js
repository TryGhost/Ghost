import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class GetSetting extends Helper {
    @service settings;

    compute([key = '']) {
        return this.settings[key];
    }
}
