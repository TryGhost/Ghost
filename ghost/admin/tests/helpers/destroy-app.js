import {run} from '@ember/runloop';

export default function destroyApp(application) {
    // this is required to fix "second Pretender instance" warnings
    if (server) {
        server.shutdown();
    }

    run(application, 'destroy');
}
