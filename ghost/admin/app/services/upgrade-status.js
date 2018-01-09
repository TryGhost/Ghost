import Service, {inject as service} from '@ember/service';
import {get, set} from '@ember/object';
import {htmlSafe} from '@ember/string';

export default Service.extend({
    notifications: service(),

    isRequired: false,
    message: '',

    // called when notifications are fetched during app boot for notifications
    // where the `location` is not 'top' and `custom` is false
    handleUpgradeNotification(notification) {
        let message = get(notification, 'message');
        set(this, 'message', htmlSafe(message));
    },

    // called when a MaintenanceError is encountered
    maintenanceAlert() {
        get(this, 'notifications').showAlert(
            'Sorry, Ghost is currently undergoing maintenance, please wait a moment then try again.',
            {type: 'error', key: 'api-error.under-maintenance'}
        );
    },

    // called when a VersionMismatchError is encountered
    requireUpgrade() {
        set(this, 'isRequired', true);
        get(this, 'notifications').showAlert(
            'Ghost has been upgraded, please copy any unsaved data and refresh the page to continue.',
            {type: 'error', key: 'api-error.upgrade-required'}
        );
    }
});
