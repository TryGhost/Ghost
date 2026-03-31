import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';
import {get, set} from '@ember/object';
import {htmlSafe} from '@ember/template';

@classic
export default class UpgradeStatusService extends Service {
    @service notifications;

    isRequired = false;
    message = '';

    // called when notifications are fetched during app boot for notifications
    // where the `location` is not 'top' and `custom` is false
    handleUpgradeNotification(notification) {
        let message = get(notification, 'message');
        set(this, 'message', htmlSafe(message));
    }

    // called when a MaintenanceError is encountered
    maintenanceAlert() {
        this.notifications.showAlert(
            'Sorry, Ghost is currently undergoing maintenance, please wait a moment then try again.',
            {type: 'error', key: 'api-error.under-maintenance'}
        );
    }

    // called when a VersionMismatchError is encountered
    requireUpgrade() {
        set(this, 'isRequired', true);
        this.notifications.showAlert(
            'Ghost has been upgraded, please copy any unsaved data and refresh the page to continue.',
            {type: 'error', key: 'api-error.upgrade-required'}
        );
    }
}
