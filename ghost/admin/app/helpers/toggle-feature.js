import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class ToggleFeature extends Helper {
    @service feature;

    compute([featureFlag]) {
        return () => {
            const flag = !!this.feature.get(featureFlag);
            this.feature.set(featureFlag, !flag);
        };
    }
}
