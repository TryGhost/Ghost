/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
}
from 'ember-mocha';
import sinon from 'sinon';

describeComponent(
    'gh-alert',
    'GhAlertComponent', {
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
            expect(this.$().hasClass('gh-alert')).to.be.true;
            expect(this.$().text()).to.match(/Test message/);
        });

        it('maps success alert type to correct class', function () {
            var component = this.subject();
            component.set('message', {message: 'Test message', type: 'success'});
            expect(this.$().hasClass('gh-alert-green')).to.be.true;
        });

        it('maps error alert type to correct class', function () {
            var component = this.subject();
            component.set('message', {message: 'Test message', type: 'error'});
            expect(this.$().hasClass('gh-alert-red')).to.be.true;
        });

        it('maps warn alert type to correct class', function () {
            var component = this.subject();
            component.set('message', {message: 'Test message', type: 'warn'});
            expect(this.$().hasClass('gh-alert-yellow')).to.be.true;
        });

        it('maps info alert type to correct class', function () {
            var component = this.subject();
            component.set('message', {message: 'Test message', type: 'info'});
            expect(this.$().hasClass('gh-alert-blue')).to.be.true;
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
    }
);
