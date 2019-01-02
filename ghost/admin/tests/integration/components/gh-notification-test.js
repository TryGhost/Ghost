import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
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
});
