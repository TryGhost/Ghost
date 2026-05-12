import {AjaxError, InvalidError} from 'ember-ajax/errors';
import {ServerUnreachableError} from 'ghost-admin/services/ajax';
import {beforeEach, describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {htmlSafe} from '@ember/template';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';

import {GENERIC_ERROR_MESSAGE} from 'ghost-admin/services/notifications';

// Alerts no longer live in the notifications service — every alert fires a
// delta through the state bridge into the React Query cache. These helpers
// capture the bridge events so tests can assert on what the service sent.
function attachBridgeRecorder(owner) {
    const bridge = owner.lookup('service:state-bridge');
    const events = [];
    const onPush = alert => events.push({type: 'push', alert});
    const onRemoveByKey = ({keyBase}) => events.push({type: 'removeByKey', keyBase});
    const onClear = () => events.push({type: 'clear'});
    bridge.on('alertPush', onPush);
    bridge.on('alertsRemoveByKey', onRemoveByKey);
    bridge.on('alertsClear', onClear);
    return {
        events,
        pushed: () => events.filter(e => e.type === 'push').map(e => e.alert),
        teardown() {
            bridge.off('alertPush', onPush);
            bridge.off('alertsRemoveByKey', onRemoveByKey);
            bridge.off('alertsClear', onClear);
        }
    };
}

describe('Unit: Service: notifications', function () {
    setupTest();

    let recorder;

    beforeEach(function () {
        const notifications = this.owner.lookup('service:notifications');
        notifications.set('content', emberA());
        notifications.set('delayedToasts', emberA());
        notifications.set('delayedAlerts', emberA());
        recorder = attachBridgeRecorder(this.owner);
    });

    afterEach(function () {
        recorder.teardown();
    });

    describe('toasts (status=notification)', function () {
        it('defaults to a toast when no status is given', function () {
            const notifications = this.owner.lookup('service:notifications');

            notifications.handleNotification({message: 'Test'});

            expect(notifications.notifications)
                .to.deep.include({message: 'Test', status: 'notification'});
            expect(recorder.pushed(), 'no alert was emitted').to.be.empty;
        });

        it('removes a toast on closeNotification', function () {
            const notifications = this.owner.lookup('service:notifications');
            const toast = {message: 'Close test', status: 'notification'};

            notifications.handleNotification(toast);
            expect(notifications.notifications).to.include(toast);

            notifications.closeNotification(toast);
            expect(notifications.notifications).to.not.include(toast);
        });

        it('removes only toasts on closeNotifications', function () {
            const notifications = this.owner.lookup('service:notifications');

            notifications.showAlert('First alert');
            notifications.showNotification('First toast');
            notifications.showNotification('Second toast');

            expect(notifications.notifications.length).to.equal(2);

            run(() => notifications.closeNotifications());

            expect(notifications.notifications.length).to.equal(0);
            // alert was never stored locally, only emitted to the bridge
            expect(recorder.pushed()).to.have.lengthOf(1);
        });

        it('removes only toasts matching a key on closeNotifications(key)', function () {
            const notifications = this.owner.lookup('service:notifications');

            notifications.handleNotification({message: 'Keep me', key: 'test.keep', status: 'notification'});
            notifications.handleNotification({message: 'Drop me', key: 'test.close', status: 'notification'});
            notifications.handleNotification({message: 'Drop me too', key: 'test.close.sub', status: 'notification'});

            run(() => notifications.closeNotifications('test.close'));

            expect(notifications.notifications.length).to.equal(1);
            expect(notifications.notifications.firstObject.message).to.equal('Keep me');
        });

        it('moves delayed toasts into content on displayDelayed', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => {
                notifications.showNotification('First', {delayed: true});
                notifications.showNotification('Second', {delayed: true});
                notifications.showNotification('Third', {delayed: false});
                notifications.displayDelayed();
            });

            const messages = notifications.notifications.map(t => t.message);
            expect(messages).to.have.members(['First', 'Second', 'Third']);
        });
    });

    describe('alerts (status=alert)', function () {
        it('emits a push to the bridge for showAlert', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAlert('Test Alert', {type: 'error'}));

            const [alert] = recorder.pushed();
            expect(alert).to.include({message: 'Test Alert', status: 'alert', type: 'error'});
            expect(alert.id).to.be.a('string');
        });

        it('emits a removeByKey to the bridge for closeAlerts(key)', function () {
            const notifications = this.owner.lookup('service:notifications');

            notifications.closeAlerts('test.close.sub');

            expect(recorder.events).to.deep.include({type: 'removeByKey', keyBase: 'test.close'});
        });

        it('emits a clear to the bridge for closeAlerts() with no key', function () {
            const notifications = this.owner.lookup('service:notifications');

            notifications.closeAlerts();

            expect(recorder.events).to.deep.include({type: 'clear'});
        });

        it('entity-escapes plain string messages before crossing the bridge', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAlert('<script>x</script>', {type: 'error'}));

            const [alert] = recorder.pushed();
            expect(alert.message).to.equal('&lt;script&gt;x&lt;/script&gt;');
        });

        it('passes htmlSafe-wrapped messages through unescaped', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAlert(htmlSafe('A <a href="/">link</a>'), {type: 'info'}));

            const [alert] = recorder.pushed();
            expect(alert.message).to.equal('A <a href="/">link</a>');
        });

        it('entity-escapes showAPIError messages so server-controlled payloads cannot inject HTML', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError(new AjaxError({errors: [{message: '<img src=x onerror=1>'}]})));

            const alert = recorder.pushed().at(-1);
            expect(alert.message).to.equal('&lt;img src=x onerror=1&gt;');
        });

        it('queues delayed alerts and flushes them on displayDelayed', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAlert('Delayed', {delayed: true, type: 'error'}));
            expect(recorder.pushed(), 'nothing emitted while queued').to.be.empty;

            run(() => notifications.displayDelayed());

            expect(recorder.pushed()).to.have.lengthOf(1);
            expect(recorder.pushed()[0].message).to.equal('Delayed');
        });
    });

    describe('clearAll', function () {
        it('empties toasts and emits an alert clear to the bridge', function () {
            const notifications = this.owner.lookup('service:notifications');

            notifications.showAlert('Alert');
            notifications.showNotification('Toast');

            notifications.clearAll();

            expect(notifications.content).to.be.empty;
            expect(recorder.events).to.deep.include({type: 'clear'});
        });
    });

    describe('error sanitization', function () {
        it('substitutes a generic message when the input contains a built-in JS error name', function () {
            const notifications = this.owner.lookup('service:notifications');

            notifications.handleNotification({message: 'TypeError test', status: 'notification'});
            expect(notifications.content[0].message).to.equal(GENERIC_ERROR_MESSAGE);

            notifications.set('content', emberA());
            notifications.handleNotification({message: 'TypeError: Testing', status: 'notification'});
            expect(notifications.content[0].message).to.equal(GENERIC_ERROR_MESSAGE);

            notifications.set('content', emberA());
            notifications.handleNotification({message: 'Unknown error - TypeError, cannot save invite.', status: 'notification'});
            expect(notifications.content[0].message).to.equal(GENERIC_ERROR_MESSAGE);
        });

        it('substitutes a generic message for built-in JS Error subclasses passed to showAPIError', function () {
            const notifications = this.owner.lookup('service:notifications');

            notifications.showAPIError(new TypeError('Testing'));

            expect(recorder.pushed()[0].message).to.equal(GENERIC_ERROR_MESSAGE);
        });
    });

    describe('showAPIError', function () {
        it('parses a single error from a JSON response', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError(new AjaxError({errors: [{message: 'Single error'}]})));

            const [alert] = recorder.pushed();
            expect(alert).to.include({message: 'Single error', status: 'alert', type: 'error', key: 'api-error'});
        });

        it('parses multiple errors into separate alerts', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError(new AjaxError({errors: [
                {title: 'First error', message: 'First error message'},
                {title: 'Second error', message: 'Second error message'}
            ]})));

            const pushed = recorder.pushed();
            expect(pushed).to.have.lengthOf(2);
            expect(pushed[0]).to.include({message: 'First error message', key: 'api-error.first-error'});
            expect(pushed[1]).to.include({message: 'Second error message', key: 'api-error.second-error'});
        });

        it('falls back to a generic message when the response has none', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError(false));
            expect(recorder.pushed().at(-1)).to.include({message: GENERIC_ERROR_MESSAGE, key: 'api-error'});

            run(() => notifications.showAPIError(false, {defaultErrorText: 'Overridden default'}));
            expect(recorder.pushed().at(-1)).to.include({message: 'Overridden default', key: 'api-error'});
        });

        it('namespaces caller-supplied keys under api-error', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError('Test', {key: 'test.alert'}));

            expect(recorder.pushed().at(-1).key).to.equal('api-error.test.alert');
        });

        it('defaults the key to api-error when none is supplied', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError('Test'));

            expect(recorder.pushed().at(-1).key).to.equal('api-error');
        });

        it('uses the error message from an ember-ajax InvalidError', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError(new InvalidError()));

            expect(recorder.pushed().at(-1)).to.include({
                message: 'Request was rejected because it was invalid',
                type: 'error',
                key: 'api-error'
            });
        });

        it('uses the error message from a ServerUnreachableError', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError(new ServerUnreachableError()));

            expect(recorder.pushed().at(-1)).to.include({
                message: 'Server was unreachable',
                type: 'error',
                key: 'api-error'
            });
        });

        it('appends the error context to the message when present', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError(new AjaxError({errors: [{
                message: 'Authorization Error.',
                context: 'Please sign in.'
            }]})));

            expect(recorder.pushed().at(-1).message).to.equal('Authorization Error. Please sign in.');
        });

        it('does not duplicate the context when it equals the message', function () {
            const notifications = this.owner.lookup('service:notifications');

            run(() => notifications.showAPIError(new AjaxError({errors: [{
                message: 'Authorization Error.',
                context: 'Authorization Error.'
            }]})));

            expect(recorder.pushed().at(-1).message).to.equal('Authorization Error.');
        });
    });
});
