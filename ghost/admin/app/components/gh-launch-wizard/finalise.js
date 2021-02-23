import Component from '@glimmer/component';
import {htmlSafe} from '@ember/string';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class GhLaunchWizardFinaliseComponent extends Component {
    @service feature;
    @service notifications;
    @service router;

    @task
    *finaliseTask() {
        yield this.feature.set('launchComplete', true);
        this.router.transitionTo('dashboard');
        this.notifications.showNotification(
            'Launch complete!',
            {type: 'success', actions: htmlSafe('<a href="#/posts">Start creating content</a>')}
        );
    }
}
