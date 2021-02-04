import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class GhLaunchWizardFinaliseComponent extends Component {
    @service feature;
    @service router;

    @task
    *finaliseTask() {
        yield this.feature.set('launchComplete', true);
        this.router.transitionTo('dashboard');
    }
}