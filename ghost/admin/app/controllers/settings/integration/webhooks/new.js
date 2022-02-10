import Controller from '@ember/controller';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {alias} from '@ember/object/computed';

@classic
export default class NewController extends Controller {
    @alias('model')
        webhook;

    @action
    save() {
        return this.webhook.save();
    }

    @action
    cancel() {
        // 'new' route's dectivate hook takes care of rollback
        return this.webhook.get('integration').then((integration) => {
            this.transitionToRoute('settings.integration', integration);
        });
    }
}
