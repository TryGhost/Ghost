// TODO: remove this file once canDispatchToEventManager is deprecated
// https://github.com/emberjs/ember.js/issues/14754
import Ember from 'ember';

const {EventDispatcher} = Ember;

const myEventDispatcher = EventDispatcher.extend({
    canDispatchToEventManager: false
});

export function initialize(application) {
    application.register('event_dispatcher:main', myEventDispatcher);
}

export default {
    name: 'event-dispatcher',
    initialize
};
