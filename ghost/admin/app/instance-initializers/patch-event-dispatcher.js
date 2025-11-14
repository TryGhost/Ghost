// In the React shell we use {{in-element}} to render modals outside of the Ember root
// so we need the EventDispatcher to listen to events on the body element instead of
// the root element in order to capture events that bubble up from modals.

export function initialize(appInstance) {
    const inAdminForward = document.querySelector('#ember-app') !== null;

    if (!inAdminForward) {
        return;
    }

    const dispatcher = appInstance.lookup('event_dispatcher:main');
    const originalSetup = dispatcher.setup;

    dispatcher.setup = function (addedEvents) {
        return originalSetup.call(this, addedEvents, 'body');
    };
}

export default {
    name: 'patch-event-dispatcher',
    initialize
};
