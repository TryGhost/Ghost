/* global key */
import {run} from '@ember/runloop';

export default function destroyApp(application) {
    // this is required to fix "second Pretender instance" warnings
    if (server) {
        server.shutdown();
    }

    // extra check to ensure we don't have references hanging around via key
    // bindings on supposedly destroyed objects
    key.deleteScope('default');

    run(application, 'destroy');
}
