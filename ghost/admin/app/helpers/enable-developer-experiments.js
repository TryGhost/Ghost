import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default Helper.extend({
    config: service(),

    compute() {
        return this.config.get('enableDeveloperExperiments');
    }
});
