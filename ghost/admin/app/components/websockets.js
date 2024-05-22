import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class Websockets extends Component {
    @service('socket-io') socketIOService;

    constructor(...args) {
        super(...args);
        // initialize connection

        // TODO: ensure this works with subdirectories
        let origin = window.location.origin; // this gives us host:port
        let socket = this.socketIOService.socketFor(origin);
        // add listener
        socket.on('addCount', (value) => {
            this.counter = value;
        });
    }

    // button counter
    @tracked counter = 0;

    // handle button/event
    @action handleClick() {
        let socket = this.socketIOService.socketFor(origin);
        this.counter = 1 + this.counter;
        socket.emit('addCount', this.counter);
    }
}
