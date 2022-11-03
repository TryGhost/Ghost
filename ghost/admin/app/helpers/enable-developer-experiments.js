import Helper from '@ember/component/helper';
import {inject} from 'ghost-admin/decorators/inject';

export default class EnableDeveloperExperimentsHelper extends Helper {
    @inject config;

    compute() {
        return this.config.enableDeveloperExperiments;
    }
}
