import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class EnableDeveloperExperimentsHelper extends Helper {
    @service config;

    compute() {
        return this.config.get('enableDeveloperExperiments');
    }
}
