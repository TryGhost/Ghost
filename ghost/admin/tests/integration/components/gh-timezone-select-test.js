import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import wait from 'ember-test-helpers/wait';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-timezone-select', function () {
    setupComponentTest('gh-timezone-select', {
        integration: true
    });

    beforeEach(function () {
        this.set('availableTimezones', [
            {name: 'Pacific/Pago_Pago', label: '(GMT -11:00) Midway Island, Samoa'},
            {name: 'Etc/UTC', label: '(GMT) UTC'},
            {name: 'Pacific/Kwajalein', label: '(GMT +12:00) International Date Line West'}
        ]);
        this.set('activeTimezone', 'Etc/UTC');
    });

    it('renders', function () {
        this.render(hbs`{{gh-timezone-select
            availableTimezones=availableTimezones
            activeTimezone=activeTimezone}}`);

        expect(this.$(), 'top-level elements').to.have.length(1);
        expect(this.$('option'), 'number of options').to.have.length(3);
        expect(this.$('select').val(), 'selected option value').to.equal('Etc/UTC');
    });

    it('handles an unknown timezone', function () {
        this.set('activeTimezone', 'Europe/London');

        this.render(hbs`{{gh-timezone-select
            availableTimezones=availableTimezones
            activeTimezone=activeTimezone}}`);

        // we have an additional blank option at the top
        expect(this.$('option'), 'number of options').to.have.length(4);
        // blank option is selected
        expect(this.$('select').val(), 'selected option value').to.equal('');
        // we indicate the manual override
        expect(this.$('p').text()).to.match(/Your timezone has been automatically set to Europe\/London/);
    });

    it('triggers update action on change', function (done) {
        let update = sinon.spy();
        this.set('update', update);

        this.render(hbs`{{gh-timezone-select
            availableTimezones=availableTimezones
            activeTimezone=activeTimezone
            update=(action update)}}`);

        run(() => {
            this.$('select').val('Pacific/Pago_Pago').change();
        });

        wait().then(() => {
            expect(update.calledOnce, 'update was called once').to.be.true;
            expect(update.firstCall.args[0].name, 'update was passed new timezone')
                .to.equal('Pacific/Pago_Pago');
            done();
        });
    });

    // TODO: mock clock service, fake the time, test we have the correct
    // local time and it changes alongside selection changes
    it('renders local time');
});
