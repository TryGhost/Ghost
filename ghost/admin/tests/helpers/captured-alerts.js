// Alerts are pushed across the state bridge to the React Query cache, so
// they're not readable from the Ember side in the test harness. Tests that
// need to assert "this action raised an alert" subscribe to the bridge here.

export function captureAlerts(owner) {
    const bridge = owner.lookup('service:state-bridge');
    const pushed = [];
    const removeByKey = [];
    let cleared = 0;

    const onPush = alert => pushed.push(alert);
    const onRemoveByKey = ({keyBase}) => removeByKey.push(keyBase);
    const onClear = () => {
        cleared += 1;
    };

    bridge.on('alertPush', onPush);
    bridge.on('alertsRemoveByKey', onRemoveByKey);
    bridge.on('alertsClear', onClear);

    return {
        pushed,
        removeByKey,
        get cleared() {
            return cleared;
        },
        teardown() {
            bridge.off('alertPush', onPush);
            bridge.off('alertsRemoveByKey', onRemoveByKey);
            bridge.off('alertsClear', onClear);
        }
    };
}
