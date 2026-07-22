export function initialize(appInstance) {
    const stateBridge = appInstance.lookup('service:state-bridge');

    window.EmberBridge = {
        state: stateBridge
    };
}

export default {
    name: 'ember-bridge-global',
    initialize
};
