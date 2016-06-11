import Ember from 'ember';

const {run} = Ember;

export default function destroyApp(application) {
    run(application, 'destroy');
}
