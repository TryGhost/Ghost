import RSVP from 'rsvp';
import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default Route.extend({
    limit: service(),

    model() {
        if (this.limit.limiter
            && this.limit.limiter.isLimited('customIntegrations')) {
            return RSVP.hash({
                integration: this.store.createRecord('integration'),
                hostLimitError: this.limit.limiter.errorIfWouldGoOverLimit('customIntegrations')
                    .then(() => null)
                    .catch((error) => {
                        return error;
                    })
            });
        } else {
            return RSVP.hash({
                integration: this.store.createRecord('integration'),
                hostLimitError: null
            });
        }
    },

    deactivate() {
        this._super(...arguments);
        this.controller.integration.rollbackAttributes();
    }
});
