/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
}
from 'ember-mocha';
import sinon from 'sinon';

describeComponent(
    'gh-notification',
    'GhNotificationComponent', {
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    },
    function () {
        it('renders', function () {
            // creates the component instance
            var component = this.subject();
            expect(component._state).to.equal('preRender');

            component.set('message', {message: 'Test message', type: 'success'});

            // renders the component on the page
            this.render();
            expect(component._state).to.equal('inDOM');

            expect(this.$().prop('tagName')).to.equal('ARTICLE');
            expect(this.$().is('.gh-notification, .gh-notification-passive')).to.be.true;
            expect(this.$().text()).to.match(/Test message/);
        });

        it('maps success alert type to correct class', function () {
            var component = this.subject();
            component.set('message', {message: 'Test message', type: 'success'});
            expect(this.$().hasClass('gh-notification-green')).to.be.true;
        });

        it('maps error alert type to correct class', function () {
            var component = this.subject();
            component.set('message', {message: 'Test message', type: 'error'});
            expect(this.$().hasClass('gh-notification-red')).to.be.true;
        });

        it('maps warn alert type to correct class', function () {
            var component = this.subject();
            component.set('message', {message: 'Test message', type: 'warn'});
            expect(this.$().hasClass('gh-notification-yellow')).to.be.true;
        });

        it('closes notification through notifications service', function () {
            var component = this.subject(),
                notifications = {},
                notification = {message: 'Test close', type: 'success'};

            notifications.closeNotification = sinon.spy();
            component.set('notifications', notifications);
            component.set('message', notification);

            this.$().find('button').click();

            expect(notifications.closeNotification.calledWith(notification)).to.be.true;
        });

        it('closes notification when animationend event is triggered', function (done) {
            var component = this.subject(),
                notifications = {},
                notification = {message: 'Test close', type: 'success'};

            notifications.closeNotification = sinon.spy();
            component.set('notifications', notifications);
            component.set('message', notification);

            // shorten the animation delay to speed up test
            this.$().css('animation-delay', '0.1s');
            setTimeout(function () {
                expect(notifications.closeNotification.calledWith(notification)).to.be.true;
                done();
            }, 150);
        });
    }
);
