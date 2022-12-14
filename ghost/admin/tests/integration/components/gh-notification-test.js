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

describe('Integration: Component: gh-notification', function () {
    setupRenderingTest();

    it('renders', async function () {
        this.set('message', new Message({message: 'Test message', type: 'success'}));

        await render(hbs`<GhNotification @message={{this.message}} />`);

        expect(find('article.gh-notification')).to.exist;

        let notification = find('.gh-notification');
        expect(notification).to.have.class('gh-notification-passive');
        expect(notification).to.contain.text('Test message');
    });

    it('maps message types to CSS classes', async function () {
        this.set('message', new Message({message: 'Test message', type: 'success'}));

        await render(hbs`<GhNotification @message={{this.message}} />`);
        let notification = find('.gh-notification');

        this.message.type = 'error';
        await settled();
        expect(notification, 'success class is red')
            .to.have.class('gh-notification-red');

        this.message.type = 'warn';
        await settled();
        expect(notification, 'success class is yellow')
            .to.have.class('gh-notification-yellow');
    });

    it('closes notification through notifications service', async function () {
        let message = new Message({message: 'Test close', type: 'success'});
        this.set('message', message);

        let notifications = this.owner.lookup('service:notifications');
        notifications.closeNotification = sinon.stub();

        await render(hbs`<GhNotification @message={{this.message}} />`);
        expect(find('.gh-notification')).to.exist;

        await click('[data-test-button="close-notification"]');

        expect(notifications.closeNotification.calledWith(message)).to.be.true;
    });
});
