/* jshint expr:true */
import { expect } from 'chai';
import {
  describeComponent,
  it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
    'gh-notification',
    'Integration: Component: gh-notification',
    {
        integration: true
    },
    function () {
        it('renders', function () {
            this.set('message', {message: 'Test message', type: 'success'});

            this.render(hbs`{{gh-notification message=message}}`);

            expect(this.$('article.gh-notification')).to.have.length(1);
            let $notification = this.$('.gh-notification');

            expect($notification.hasClass('gh-notification-passive')).to.be.true;
            expect($notification.text()).to.match(/Test message/);
        });

        it('maps message types to CSS classes', function () {
            this.set('message', {message: 'Test message', type: 'success'});

            this.render(hbs`{{gh-notification message=message}}`);
            let $notification = this.$('.gh-notification');

            this.set('message.type', 'success');
            expect($notification.hasClass('gh-notification-green'), 'success class isn\'t green').to.be.true;

            this.set('message.type', 'error');
            expect($notification.hasClass('gh-notification-red'), 'success class isn\'t red').to.be.true;

            this.set('message.type', 'warn');
            expect($notification.hasClass('gh-notification-yellow'), 'success class isn\'t yellow').to.be.true;
        });
    }
);
