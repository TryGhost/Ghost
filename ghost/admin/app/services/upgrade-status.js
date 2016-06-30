import Service from 'ember-service';
import injectService from 'ember-service/inject';

export default Service.extend({
    isRequired: false,

    notifications: injectService(),

    requireUpgrade() {
        this.set('isRequired', true);
        this.get('notifications').showAlert(
            'Ghost has been upgraded, please copy any unsaved data and refresh the page to continue.',
            {type: 'error', key: 'api-error.upgrade-required'}
        );
    }
});
