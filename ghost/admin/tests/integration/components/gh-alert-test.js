import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, find, render, settled} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';
import {tracked} from '@glimmer/tracking';

class Message {
    @tracked message;
    @tracked type;

    constructor({message, type}) {
        this.message = message;
        this.type = type;
    }
}

describe('Integration: Component: gh-alert', function () {
    setupRenderingTest();

    it('renders', async function () {
        this.set('message', new Message({message: 'Test message', type: 'success'}));

        await render(hbs`<GhAlert @message={{this.message}} />`);

        let alert = this.element.querySelector('article.gh-alert');
        expect(alert).to.exist;
        expect(alert).to.contain.text('Test message');
    });

    it('maps message types to CSS classes', async function () {
        this.set('message', new Message({message: 'Test message', type: 'success'}));

        await render(hbs`<GhAlert @message={{this.message}} />`);
        let alert = this.element.querySelector('article.gh-alert');

        this.message.type = 'success';
        await settled();
        expect(alert, 'success class is green').to.have.class('gh-alert-green');

        this.message.type = 'error';
        await settled();
        expect(alert, 'error class is red').to.have.class('gh-alert-red');

        this.message.type = 'warn';
        await settled();
        expect(alert, 'warn class is yellow').to.have.class('gh-alert-blue');

        this.message.type = 'info';
        await settled();
        expect(alert, 'info class is blue').to.have.class('gh-alert-blue');
    });

    it('closes notification through notifications service', async function () {
        let message = new Message({message: 'Test close', type: 'success'});
        this.set('message', message);

        await render(hbs`<GhAlert @message={{this.message}} />`);
        expect(find('article.gh-alert')).to.exist;

        let notifications = this.owner.lookup('service:notifications');
        notifications.closeNotification = sinon.stub();

        await click('[data-test-button="close-notification"]');

        expect(notifications.closeNotification.calledWith(message)).to.be.true;
    });
});
