import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, find, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-alert', function () {
    setupRenderingTest();

    it('renders', async function () {
        this.set('message', {message: 'Test message', type: 'success'});

        await render(hbs`{{gh-alert message=message}}`);

        let alert = this.element.querySelector('article.gh-alert');
        expect(alert).to.exist;
        expect(alert).to.contain.text('Test message');
    });

    it('maps message types to CSS classes', async function () {
        this.set('message', {message: 'Test message', type: 'success'});

        await render(hbs`{{gh-alert message=message}}`);
        let alert = this.element.querySelector('article.gh-alert');

        this.set('message.type', 'success');
        expect(alert, 'success class is green').to.have.class('gh-alert-green');

        this.set('message.type', 'error');
        expect(alert, 'error class is red').to.have.class('gh-alert-red');

        this.set('message.type', 'warn');
        expect(alert, 'warn class is yellow').to.have.class('gh-alert-blue');

        this.set('message.type', 'info');
        expect(alert, 'info class is blue').to.have.class('gh-alert-blue');
    });

    it('closes notification through notifications service', async function () {
        let message = {message: 'Test close', type: 'success'};
        this.set('message', message);

        await render(hbs`{{gh-alert message=message}}`);
        expect(find('article.gh-alert')).to.exist;

        let notifications = this.owner.lookup('service:notifications');
        notifications.closeNotification = sinon.stub();

        await click('[data-test-button="close-notification"]');

        expect(notifications.closeNotification.calledWith(message)).to.be.true;
    });
});
