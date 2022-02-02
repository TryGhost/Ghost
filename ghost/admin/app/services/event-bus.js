import Evented from '@ember/object/evented';
import Service from '@ember/service';
import classic from 'ember-classic-decorator';

@classic
export default class EventBusService extends Service.extend(Evented) {
    publish() {
        return this.trigger(...arguments);
    }

    subscribe() {
        return this.on(...arguments);
    }

    unsubscribe() {
        return this.off(...arguments);
    }
}
