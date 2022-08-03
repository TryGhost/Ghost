import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class EnableDeveloperExperimentsHelper extends Helper {
    @service feature;

    compute([featureFlag]) {
        return this.feature.get(featureFlag);
    }
}
