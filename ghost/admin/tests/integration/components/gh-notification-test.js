import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, find, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-notification', function () {
    setupRenderingTest();

    it('renders', async function () {
        this.set('message', {message: 'Test message', type: 'success'});

        await render(hbs`{{gh-notification message=message}}`);

        expect(find('article.gh-notification')).to.exist;

        let notification = find('.gh-notification');
        expect(notification).to.have.class('gh-notification-passive');
        expect(notification).to.contain.text('Test message');
    });

    it('maps message types to CSS classes', async function () {
        this.set('message', {message: 'Test message', type: 'success'});

        await render(hbs`{{gh-notification message=message}}`);
        let notification = find('.gh-notification');

        this.set('message.type', 'success');
        expect(notification, 'success class is green')
            .to.have.class('gh-notification-green');

        this.set('message.type', 'error');
        expect(notification, 'success class is red')
            .to.have.class('gh-notification-red');

        this.set('message.type', 'warn');
        expect(notification, 'success class is yellow')
            .to.have.class('gh-notification-yellow');
    });

    it('closes notification through notifications service', async function () {
        let message = {message: 'Test close', type: 'success'};
        this.set('message', message);

        let notifications = this.owner.lookup('service:notifications');
        notifications.closeNotification = sinon.stub();

        await render(hbs`{{gh-notification message=message}}`);
        expect(find('.gh-notification')).to.exist;

        await click('[data-test-button="close-notification"]');

        expect(notifications.closeNotification.calledWith(message)).to.be.true;
    });
});
