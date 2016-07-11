import Service from 'ember-service';
import injectService from 'ember-service/inject';

export default Service.extend({
    isRequired: false,

    notifications: injectService(),

    maintenanceAlert() {
        this.get('notifications').showAlert(
            'Sorry, Ghost is currently undergoing maintenance, please wait a moment then try again.',
            {type: 'error', key: 'api-error.under-maintenance'}
        );
    },

    requireUpgrade() {
        this.set('isRequired', true);
        this.get('notifications').showAlert(
            'Ghost has been upgraded, please copy any unsaved data and refresh the page to continue.',
            {type: 'error', key: 'api-error.upgrade-required'}
        );
    }
});
