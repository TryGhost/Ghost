import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {render} from '@ember/test-helpers';
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
});
