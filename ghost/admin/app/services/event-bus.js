import Evented from '@ember/object/evented';
import Service from '@ember/service';

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
