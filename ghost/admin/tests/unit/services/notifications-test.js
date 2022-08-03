import EmberObject from '@ember/object';
import sinon from 'sinon';
import {AjaxError, InvalidError} from 'ember-ajax/errors';
import {ServerUnreachableError} from 'ghost-admin/services/ajax';
import {describe, it} from 'mocha';
import {A as emberA} from '@ember/array';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';

import {GENERIC_ERROR_MESSAGE} from 'ghost-admin/services/notifications';

// notifications service determines if a notification is a model instance by
// checking `notification.constructor.modelName === 'notification'`
const NotificationStub = EmberObject.extend();
NotificationStub.modelName = 'notification';

describe('Unit: Service: notifications', function () {
    setupTest();

    beforeEach(function () {
        this.owner.lookup('service:notifications').set('content', emberA());
        this.owner.lookup('service:notifications').set('delayedNotifications', emberA());
    });

    it('filters alerts/notifications', function () {
        let notifications = this.owner.lookup('service:notifications');

        // wrapped in run-loop to enure alerts/notifications CPs are updated
        run(() => {
            notifications.showAlert('Alert');
            notifications.showNotification('Notification');
        });

        expect(notifications.alerts.length).to.equal(1);
        expect(notifications.alerts.firstObject.message).to.equal('Alert');

        expect(notifications.notifications.length).to.equal(1);
        expect(notifications.notifications.firstObject.message).to.equal('Notification');
    });

    it('#handleNotification deals with DS.Notification notifications', function () {
        let notifications = this.owner.lookup('service:notifications');
        let notification = NotificationStub.create({message: '<h1>Test</h1>', status: 'alert'});

        notifications.handleNotification(notification);

        notification = notifications.alerts[0];

        // alerts received from the server should be marked html safe
        expect(notification.message).to.have.property('toHTML');
    });

    it('#handleNotification defaults to notification if no status supplied', function () {
        let notifications = this.owner.lookup('service:notifications');

        notifications.handleNotification({message: 'Test'}, false);

        expect(notifications.content)
            .to.deep.include({message: 'Test', status: 'notification'});
    });

    it('#handleNotification shows generic error message when a word matches built-in error type', function () {
        let notifications = this.owner.lookup('service:notifications');

        notifications.handleNotification({message: 'TypeError test'});
        expect(notifications.content[0].message).to.equal(GENERIC_ERROR_MESSAGE);

        notifications.clearAll();
        expect(notifications.content.length).to.equal(0);

        notifications.handleNotification({message: 'TypeError: Testing'});
        expect(notifications.content[0].message).to.equal(GENERIC_ERROR_MESSAGE);

        notifications.clearAll();
        notifications.handleNotification({message: 'Unknown error - TypeError, cannot save invite.'});
        expect(notifications.content[0].message).to.equal(GENERIC_ERROR_MESSAGE);
    });

    it('#showAlert adds POJO alerts', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showAlert('Test Alert', {type: 'error'});
        });

        expect(notifications.alerts)
            .to.deep.include({message: 'Test Alert', status: 'alert', type: 'error', key: undefined, actions: undefined, description: undefined, icon: undefined});
    });

    it('#showAlert adds delayed notifications', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showNotification('Test Alert', {type: 'error', delayed: true});
        });

        expect(notifications.delayedNotifications)
            .to.deep.include({message: 'Test Alert', status: 'notification', type: 'error', key: undefined, actions: undefined, description: undefined, icon: undefined});
    });

    // in order to cater for complex keys that are suitable for i18n
    // we split on the second period and treat the resulting base as
    // the key for duplicate checking
    it('#showAlert clears duplicates using keys', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showAlert('Kept');
            notifications.showAlert('Duplicate', {key: 'duplicate.key.fail'});
        });

        expect(notifications.alerts.length).to.equal(2);

        run(() => {
            notifications.showAlert('Duplicate with new message', {key: 'duplicate.key.success'});
        });

        expect(notifications.alerts.length).to.equal(2);
        expect(notifications.alerts.lastObject.message).to.equal('Duplicate with new message');
    });

    it('#showAlert clears duplicates using message text', function () {
        let notifications = this.owner.lookup('service:notifications');

        notifications.showAlert('Not duplicate');
        notifications.showAlert('Duplicate', {key: 'duplicate'});
        notifications.showAlert('Duplicate');

        expect(notifications.alerts.length).to.equal(2);
        expect(notifications.alerts.lastObject.key).to.not.exist;
    });

    it('#showNotification adds POJO notifications', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showNotification('Test Notification', {type: 'success'});
        });

        expect(notifications.notifications)
            .to.deep.include({message: 'Test Notification', status: 'notification', type: 'success', key: undefined, actions: undefined, description: undefined, icon: undefined});
    });

    it('#showNotification adds delayed notifications', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showNotification('Test Notification', {delayed: true});
        });

        expect(notifications.delayedNotifications)
            .to.deep.include({message: 'Test Notification', status: 'notification', type: undefined, key: undefined, actions: undefined, description: undefined, icon: undefined});
    });

    it('#showAPIError handles single json response error', function () {
        let notifications = this.owner.lookup('service:notifications');
        let error = new AjaxError({errors: [{message: 'Single error'}]});

        run(() => {
            notifications.showAPIError(error);
        });

        let [alert] = notifications.alerts;
        expect(alert.message).to.equal('Single error');
        expect(alert.status).to.equal('alert');
        expect(alert.type).to.equal('error');
        expect(alert.key).to.equal('api-error');
    });

    it('#showAPIError handles multiple json response errors', function () {
        let notifications = this.owner.lookup('service:notifications');
        let error = new AjaxError({errors: [
            {title: 'First error', message: 'First error message'},
            {title: 'Second error', message: 'Second error message'}
        ]});

        run(() => {
            notifications.showAPIError(error);
        });

        expect(notifications.alerts.length).to.equal(2);
        let [alert1, alert2] = notifications.alerts;
        expect(alert1).to.deep.equal({message: 'First error message', status: 'alert', type: 'error', key: 'api-error.first-error', actions: undefined, description: undefined, icon: undefined});
        expect(alert2).to.deep.equal({message: 'Second error message', status: 'alert', type: 'error', key: 'api-error.second-error', actions: undefined, description: undefined, icon: undefined});
    });

    it('#showAPIError displays default error text if response has no error/message', function () {
        let notifications = this.owner.lookup('service:notifications');
        let resp = false;

        run(() => {
            notifications.showAPIError(resp);
        });
        expect(notifications.content).to.deep.equal([
            {message: 'There was a problem on the server, please try again.', status: 'alert', type: 'error', key: 'api-error', actions: undefined, description: undefined, icon: undefined}
        ]);

        notifications.set('content', emberA());

        run(() => {
            notifications.showAPIError(resp, {defaultErrorText: 'Overridden default'});
        });
        expect(notifications.content).to.deep.equal([
            {message: 'Overridden default', status: 'alert', type: 'error', key: 'api-error', actions: undefined, description: undefined, icon: undefined}
        ]);
    });

    it('#showAPIError sets correct key when passed a base key', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showAPIError('Test', {key: 'test.alert'});
        });

        expect(notifications.alerts.firstObject.key).to.equal('api-error.test.alert');
    });

    it('#showAPIError sets correct key when not passed a key', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showAPIError('Test');
        });

        expect(notifications.alerts.firstObject.key).to.equal('api-error');
    });

    it('#showAPIError parses default ember-ajax errors correctly', function () {
        let notifications = this.owner.lookup('service:notifications');
        let error = new InvalidError();

        run(() => {
            notifications.showAPIError(error);
        });

        let notification = notifications.alerts.firstObject;
        expect(notification.message).to.equal('Request was rejected because it was invalid');
        expect(notification.status).to.equal('alert');
        expect(notification.type).to.equal('error');
        expect(notification.key).to.equal('api-error');
    });

    it('#showAPIError parses custom ember-ajax errors correctly', function () {
        let notifications = this.owner.lookup('service:notifications');
        let error = new ServerUnreachableError();

        run(() => {
            notifications.showAPIError(error);
        });

        let notification = notifications.alerts.firstObject;
        expect(notification.message).to.equal('Server was unreachable');
        expect(notification.status).to.equal('alert');
        expect(notification.type).to.equal('error');
        expect(notification.key).to.equal('api-error');
    });

    it('#showAPIError adds error context to message if available', function () {
        let notifications = this.owner.lookup('service:notifications');
        let error = new AjaxError({errors: [{
            message: 'Authorization Error.',
            context: 'Please sign in.'
        }]});

        run(() => {
            notifications.showAPIError(error);
        });

        let [alert] = notifications.alerts;
        expect(alert.message).to.equal('Authorization Error. Please sign in.');
        expect(alert.status).to.equal('alert');
        expect(alert.type).to.equal('error');
        expect(alert.key).to.equal('api-error');
    });

    it('#showAPIError shows generic error for built-in error types', function () {
        let notifications = this.owner.lookup('service:notifications');
        const error = new TypeError('Testing');

        notifications.showAPIError(error);

        expect(notifications.alerts[0].message).to.equal(GENERIC_ERROR_MESSAGE);
    });

    it('#displayDelayed moves delayed notifications into content', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showNotification('First', {delayed: true});
            notifications.showNotification('Second', {delayed: true});
            notifications.showNotification('Third', {delayed: false});
            notifications.displayDelayed();
        });

        expect(notifications.notifications).to.deep.equal([
            {message: 'Third', status: 'notification', type: undefined, key: undefined, actions: undefined, description: undefined, icon: undefined},
            {message: 'First', status: 'notification', type: undefined, key: undefined, actions: undefined, description: undefined, icon: undefined},
            {message: 'Second', status: 'notification', type: undefined, key: undefined, actions: undefined, description: undefined, icon: undefined}
        ]);
    });

    it('#closeNotification removes POJO notifications', function () {
        let notification = {message: 'Close test', status: 'notification'};
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.handleNotification(notification);
        });

        expect(notifications.notifications)
            .to.include(notification);

        run(() => {
            notifications.closeNotification(notification);
        });

        expect(notifications.notifications)
            .to.not.include(notification);
    });

    it('#closeNotification removes and deletes DS.Notification records', function () {
        let notifications = this.owner.lookup('service:notifications');
        let notification = NotificationStub.create({message: 'Close test', status: 'alert'});

        notification.deleteRecord = function () {};
        sinon.spy(notification, 'deleteRecord');
        notification.save = function () {
            return {
                finally(callback) {
                    return callback(notification);
                }
            };
        };
        sinon.spy(notification, 'save');

        run(() => {
            notifications.handleNotification(notification);
        });

        expect(notifications.alerts).to.include(notification);

        run(() => {
            notifications.closeNotification(notification);
        });

        expect(notification.deleteRecord.calledOnce).to.be.true;
        expect(notification.save.calledOnce).to.be.true;

        expect(notifications.alerts).to.not.include(notification);
    });

    it('#closeNotifications only removes notifications', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showAlert('First alert');
            notifications.showNotification('First notification');
            notifications.showNotification('Second notification');
        });

        expect(notifications.alerts.length, 'alerts count').to.equal(1);
        expect(notifications.notifications.length, 'notifications count').to.equal(2);

        run(() => {
            notifications.closeNotifications();
        });

        expect(notifications.alerts.length, 'alerts count').to.equal(1);
        expect(notifications.notifications.length, 'notifications count').to.equal(0);
    });

    it('#closeNotifications only closes notifications with specified key', function () {
        let notifications = this.owner.lookup('service:notifications');

        run(() => {
            notifications.showAlert('First alert');
            // using handleNotification as showNotification will auto-prune duplicates
            notifications.handleNotification({message: 'First notification', key: 'test.close', status: 'notification'});
            notifications.handleNotification({message: 'Second notification', key: 'test.keep', status: 'notification'});
            notifications.handleNotification({message: 'Third notification', key: 'test.close', status: 'notification'});
        });

        run(() => {
            notifications.closeNotifications('test.close');
        });

        expect(notifications.notifications.length, 'notifications count').to.equal(1);
        expect(notifications.notifications.firstObject.message, 'notification message').to.equal('Second notification');
        expect(notifications.alerts.length, 'alerts count').to.equal(1);
    });

    it('#clearAll removes everything without deletion', function () {
        let notifications = this.owner.lookup('service:notifications');
        let notificationModel = EmberObject.create({message: 'model'});

        notificationModel.deleteRecord = function () {};
        sinon.spy(notificationModel, 'deleteRecord');
        notificationModel.save = function () {
            return {
                finally(callback) {
                    return callback(notificationModel);
                }
            };
        };
        sinon.spy(notificationModel, 'save');

        notifications.handleNotification(notificationModel);
        notifications.handleNotification({message: 'pojo'});

        notifications.clearAll();

        expect(notifications.content).to.be.empty;
        expect(notificationModel.deleteRecord.called).to.be.false;
        expect(notificationModel.save.called).to.be.false;
    });

    it('#closeAlerts only removes alerts', function () {
        let notifications = this.owner.lookup('service:notifications');

        notifications.showNotification('First notification');
        notifications.showAlert('First alert');
        notifications.showAlert('Second alert');

        run(() => {
            notifications.closeAlerts();
        });

        expect(notifications.alerts.length).to.equal(0);
        expect(notifications.notifications.length).to.equal(1);
    });

    it('#closeAlerts closes only alerts with specified key', function () {
        let notifications = this.owner.lookup('service:notifications');

        notifications.showNotification('First notification');
        notifications.showAlert('First alert', {key: 'test.close'});
        notifications.showAlert('Second alert', {key: 'test.keep'});
        notifications.showAlert('Third alert', {key: 'test.close'});

        run(() => {
            notifications.closeAlerts('test.close');
        });

        expect(notifications.alerts.length).to.equal(1);
        expect(notifications.alerts.firstObject.message).to.equal('Second alert');
        expect(notifications.notifications.length).to.equal(1);
    });
});
