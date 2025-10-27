export function initialize(appInstance) {
    window.EmberBridge = {
        getService(name) {
            return appInstance.lookup(`service:${name}`);
        }
    };
}

export default {
    name: 'react-bridge',
    initialize
};
