import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {blur, fillIn, find, findAll, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-timezone-select', function () {
    setupRenderingTest();

    beforeEach(function () {
        this.set('availableTimezones', [
            {name: 'Pacific/Pago_Pago', label: '(GMT -11:00) Midway Island, Samoa'},
            {name: 'Etc/UTC', label: '(GMT) UTC'},
            {name: 'Pacific/Kwajalein', label: '(GMT +12:00) International Date Line West'}
        ]);
        this.set('timezone', 'Etc/UTC');
    });

    it('renders', async function () {
        await render(hbs`<GhTimezoneSelect
            @availableTimezones={{this.availableTimezones}}
            @timezone={{this.timezone}}
        />`);

        expect(this.element, 'top-level elements').to.exist;
        expect(findAll('option'), 'number of options').to.have.length(3);
        expect(find('select').value, 'selected option value').to.equal('Etc/UTC');
    });

    it('handles an unknown timezone', async function () {
        this.set('timezone', 'Europe/London');

        await render(hbs`<GhTimezoneSelect
            @availableTimezones={{this.availableTimezones}}
            @timezone={{this.timezone}}
        />`);

        // we have an additional blank option at the top
        expect(findAll('option'), 'number of options').to.have.length(4);
        // blank option is selected
        expect(find('select').value, 'selected option value').to.equal('');
        // we indicate the manual override
        expect(find('p').textContent).to.match(/Your timezone has been automatically set to Europe\/London/);
    });

    it('triggers update action on change', async function () {
        let update = sinon.spy();
        this.set('update', update);

        await render(hbs`<GhTimezoneSelect
            @availableTimezones={{this.availableTimezones}}
            @timezone={{this.timezone}}
            @update={{this.update}}
        />`);

        await fillIn('select', 'Pacific/Pago_Pago');
        await blur('select');

        expect(update.calledOnce, 'update was called once').to.be.true;
        expect(update.firstCall.args[0].name, 'update was passed new timezone')
            .to.equal('Pacific/Pago_Pago');
    });

    // TODO: mock clock service, fake the time, test we have the correct
    // local time and it changes alongside selection changes
    it('renders local time');
});
