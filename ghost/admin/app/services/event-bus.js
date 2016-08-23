import Service from 'ember-service';
import Evented from 'ember-evented';

export default Service.extend(Evented, {
    publish() {
        return this.trigger(...arguments);
    },
    subscribe() {
        return this.on(...arguments);
    },
    unsubscribe() {
        return this.off(...arguments);
    }
});
