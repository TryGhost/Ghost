import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-notification', function () {
    setupComponentTest('gh-notification', {
        integration: true
    });

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
});
