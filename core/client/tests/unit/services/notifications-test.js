/* jshint expr:true */
import Ember from 'ember';
import sinon from 'sinon';
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';

describeModule(
    'service:notifications',
    'NotificationsService',
    {
        // Specify the other units that are required for this test.
        // needs: ['model:notification']
    },
    function () {
        beforeEach(function () {
            this.subject().set('content', Ember.A());
            this.subject().set('delayedNotifications', Ember.A());
        });

        it('filters alerts/notifications', function () {
            var notifications = this.subject();

            notifications.set('content', [
                {message: 'Alert', status: 'alert'},
                {message: 'Notification', status: 'notification'}
            ]);

            expect(notifications.get('alerts'))
                .to.deep.equal([{message: 'Alert', status: 'alert'}]);

            expect(notifications.get('notifications'))
                .to.deep.equal([{message: 'Notification', status: 'notification'}]);
        });

        it('#handleNotification deals with DS.Notification notifications', function () {
            var notifications = this.subject(),
                notification = Ember.Object.create({message: '<h1>Test</h1>', status: 'alert'});

            notification.toJSON = function () {};

            notifications.handleNotification(notification);

            notification = notifications.get('alerts')[0];

            // alerts received from the server should be marked html safe
            expect(notification.get('message')).to.have.property('toHTML');
        });

        it('#handleNotification defaults to notification if no status supplied', function () {
            var notifications = this.subject();

            notifications.handleNotification({message: 'Test'}, false);

            expect(notifications.get('content'))
                .to.deep.include({message: 'Test', status: 'notification'});
        });

        it('#showAlert adds POJO alerts', function () {
            var notifications = this.subject();

            notifications.showAlert('Test Alert', {type: 'error'});

            expect(notifications.get('alerts'))
                .to.deep.include({message: 'Test Alert', status: 'alert', type: 'error'});
        });

        it('#showAlert adds delayed notifications', function () {
            var notifications = this.subject();

            notifications.showNotification('Test Alert', {type: 'error', delayed: true});

            expect(notifications.get('delayedNotifications'))
                .to.deep.include({message: 'Test Alert', status: 'notification', type: 'error'});
        });

        it('#showNotification adds POJO notifications', function () {
            var notifications = this.subject();

            notifications.showNotification('Test Notification', {type: 'success'});

            expect(notifications.get('notifications'))
                .to.deep.include({message: 'Test Notification', status: 'notification', type: 'success'});
        });

        it('#showNotification adds delayed notifications', function () {
            var notifications = this.subject();

            notifications.showNotification('Test Notification', {delayed: true});

            expect(notifications.get('delayedNotifications'))
                .to.deep.include({message: 'Test Notification', status: 'notification', type: undefined});
        });

        it('#showNotification clears existing notifications', function () {
            var notifications = this.subject();

            notifications.showNotification('First');
            notifications.showNotification('Second');

            expect(notifications.get('content.length')).to.equal(1);
            expect(notifications.get('content'))
                .to.deep.equal([{message: 'Second', status: 'notification', type: undefined}]);
        });

        it('#showNotification keeps existing notifications if doNotCloseNotifications option passed', function () {
            var notifications = this.subject();

            notifications.showNotification('First');
            notifications.showNotification('Second', {doNotCloseNotifications: true});

            expect(notifications.get('content.length')).to.equal(2);
        });

        // TODO: review whether this can be removed once it's no longer used by validations
        it('#showErrors adds multiple notifications', function () {
            var notifications = this.subject();

            notifications.showErrors([
                {message: 'First'},
                {message: 'Second'}
            ]);

            expect(notifications.get('content')).to.deep.equal([
                {message: 'First', status: 'notification', type: 'error'},
                {message: 'Second', status: 'notification', type: 'error'}
            ]);
        });

        it('#showAPIError adds single json response error', function () {
            var notifications = this.subject(),
                resp = {jqXHR: {responseJSON: {error: 'Single error'}}};

            notifications.showAPIError(resp);

            expect(notifications.get('content')).to.deep.equal([
                {message: 'Single error', status: 'alert', type: 'error'}
            ]);
        });

        // used to display validation errors returned from the server
        it('#showAPIError adds multiple json response errors', function () {
            var notifications = this.subject(),
                resp = {jqXHR: {responseJSON: {errors: ['First error', 'Second error']}}};

            notifications.showAPIError(resp);

            expect(notifications.get('content')).to.deep.equal([
                {message: 'First error', status: 'notification', type: 'error'},
                {message: 'Second error', status: 'notification', type: 'error'}
            ]);
        });

        it('#showAPIError adds single json response message', function () {
            var notifications = this.subject(),
                resp = {jqXHR: {responseJSON: {message: 'Single message'}}};

            notifications.showAPIError(resp);

            expect(notifications.get('content')).to.deep.equal([
                {message: 'Single message', status: 'alert', type: 'error'}
            ]);
        });

        it('#showAPIError displays default error text if response has no error/message', function () {
            var notifications = this.subject(),
                resp = {};

            notifications.showAPIError(resp);
            expect(notifications.get('content')).to.deep.equal([
                {message: 'There was a problem on the server, please try again.', status: 'alert', type: 'error'}
            ]);

            notifications.set('content', Ember.A());

            notifications.showAPIError(resp, {defaultErrorText: 'Overridden default'});
            expect(notifications.get('content')).to.deep.equal([
                {message: 'Overridden default', status: 'alert', type: 'error'}
            ]);
        });

        it('#displayDelayed moves delayed notifications into content', function () {
            var notifications = this.subject();

            notifications.showNotification('First', {delayed: true});
            notifications.showNotification('Second', {delayed: true});
            notifications.showNotification('Third', {delayed: false});

            notifications.displayDelayed();

            expect(notifications.get('content')).to.deep.equal([
                {message: 'Third', status: 'notification', type: undefined},
                {message: 'First', status: 'notification', type: undefined},
                {message: 'Second', status: 'notification', type: undefined}
            ]);
        });

        it('#closeNotification removes POJO notifications', function () {
            var notification = {message: 'Close test', status: 'notification'},
                notifications = this.subject();

            notifications.handleNotification(notification);

            expect(notifications.get('notifications'))
                .to.include(notification);

            notifications.closeNotification(notification);

            expect(notifications.get('notifications'))
                .to.not.include(notification);
        });

        it('#closeNotification removes and deletes DS.Notification records', function () {
            var notification = Ember.Object.create({message: 'Close test', status: 'alert'}),
                notifications = this.subject();

            notification.toJSON = function () {};
            notification.deleteRecord = function () {};
            sinon.spy(notification, 'deleteRecord');
            notification.save = function () {
                return {
                    finally: function (callback) { return callback(notification); }
                };
            };
            sinon.spy(notification, 'save');

            notifications.handleNotification(notification);
            expect(notifications.get('alerts')).to.include(notification);

            notifications.closeNotification(notification);

            expect(notification.deleteRecord.calledOnce).to.be.true;
            expect(notification.save.calledOnce).to.be.true;

            // wrap in runloop so filter updates
            Ember.run.next(function () {
                expect(notifications.get('alerts')).to.not.include(notification);
            });
        });

        it('#closeNotifications only removes notifications', function () {
            var notifications = this.subject();

            notifications.showAlert('First alert');
            notifications.showNotification('First notification');
            notifications.showNotification('Second notification', {doNotCloseNotifications: true});

            expect(notifications.get('alerts.length')).to.equal(1);
            expect(notifications.get('notifications.length')).to.equal(2);

            notifications.closeNotifications();

            // wrap in runloop so filter updates
            Ember.run.next(function () {
                expect(notifications.get('alerts.length')).to.equal(1);
                expect(notifications.get('notifications.length')).to.equal(1);
            });
        });

        it('#closeAll removes everything without deletion', function () {
            var notifications = this.subject(),
                notificationModel = Ember.Object.create({message: 'model'});

            notificationModel.toJSON = function () {};
            notificationModel.deleteRecord = function () {};
            sinon.spy(notificationModel, 'deleteRecord');
            notificationModel.save = function () {
                return {
                    finally: function (callback) { return callback(notificationModel); }
                };
            };
            sinon.spy(notificationModel, 'save');

            notifications.handleNotification(notificationModel);
            notifications.handleNotification({message: 'pojo'});

            notifications.closeAll();

            expect(notifications.get('content')).to.be.empty;
            expect(notificationModel.deleteRecord.called).to.be.false;
            expect(notificationModel.save.called).to.be.false;
        });
    }
);
