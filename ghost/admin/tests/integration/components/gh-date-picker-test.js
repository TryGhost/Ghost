// import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import moment from 'moment-timezone';
import sinon from 'sinon';
import {blur, click, fillIn, find, focus, render, triggerKeyEvent, typeIn} from '@ember/test-helpers';
import {datepickerSelect} from 'ember-power-datepicker/test-support';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

// class SettingsStub extends Service {
//     timezone = 'Etc/UTC';

//     get(key) {
//         if (key === 'timezone') {
//             return this.timezone;
//         }
//     }
// }

describe('Integration: Component: gh-date-picker', function () {
    setupRenderingTest();
    let clock;

    // beforeEach(async function () {
    //     this.owner.register('service:settings', SettingsStub);
    // });

    afterEach(function () {
        clock?.restore();
    });

    it('renders', async function () {
        await render(hbs`<GhDatePicker />`);
        expect(find('[data-test-date-picker-trigger]'), 'datepicker trigger').to.exist;
        expect(find('[data-test-date-picker-input]'), 'datepicker input').to.exist;
    });

    it('defaults to now when @value is empty', async function () {
        clock = sinon.useFakeTimers({
            now: moment('2022-02-22 22:22:22.000').toDate()
        });

        await render(hbs`<GhDatePicker />`);
        expect(find('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-22');
    });

    it('shows passed in @value value', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        await render(hbs`<GhDatePicker @value={{this.date}} />`);
        expect(find('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-22');
    });

    it('updates date via input blur', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        const changeSpy = sinon.spy();
        this.set('onChange', changeSpy);

        await render(hbs`<GhDatePicker @value={{this.date}} @onChange={{this.onChange}} />`);
        await fillIn('[data-test-date-picker-input]', '2022-02-28');
        await blur('[data-test-date-picker-input]');

        expect(changeSpy.callCount).to.equal(1);
        expect(changeSpy.firstCall.args[0]).to.be.an.instanceof(Date);
        expect(changeSpy.firstCall.args[0].toISOString()).to.equal(moment('2022-02-28T00:00:00.000').toISOString());
    });

    it('updates date via input Enter keydown', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        const changeSpy = sinon.spy();
        this.set('onChange', changeSpy);

        await render(hbs`<GhDatePicker @value={{this.date}} @onChange={{this.onChange}} />`);
        await fillIn('[data-test-date-picker-input]', '2022-02-28');
        await triggerKeyEvent('[data-test-date-picker-input]', 'keydown', 'Enter');

        expect(changeSpy.callCount).to.equal(1);
        expect(changeSpy.firstCall.args[0]).to.be.an.instanceof(Date);
        expect(changeSpy.firstCall.args[0].toISOString()).to.equal(moment('2022-02-28T00:00:00.000').toISOString());
    });

    it('updates date via datepicker selection', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        const onChange = (newDate) => {
            this.set('date', newDate);
        };
        const changeSpy = sinon.spy(onChange);
        this.set('onChange', changeSpy);

        await render(hbs`<GhDatePicker @value={{this.date}} @onChange={{this.onChange}} />`);
        await datepickerSelect('[data-test-date-picker-trigger]', moment('2022-02-27T13:00:00.000').toDate());

        expect(find('[data-test-date-picker-input]')).to.have.value('2022-02-27');

        expect(changeSpy.callCount).to.equal(1);
        expect(changeSpy.firstCall.args[0]).to.be.an.instanceof(Date);
        expect(changeSpy.firstCall.args[0].toISOString()).to.equal(moment('2022-02-27T00:00:00.000').toISOString());
    });

    it('updates when @value is changed externally', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        await render(hbs`<GhDatePicker @value={{this.date}} />`);
        expect(find('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-22');

        this.set('date', moment('2022-02-28 10:00:00.000')).toDate();

        expect(find('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-28');
    });

    it('updates when @value is changed externally when we have a scratch date', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        await render(hbs`<GhDatePicker @value={{this.date}} />`);
        expect(find('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-22');

        await fillIn('[data-test-date-picker-input]', '2022-02-27');
        expect(find('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-27');

        this.set('date', moment('2022-02-28 10:00:00.000')).toDate();
        expect(find('[data-test-date-picker-input]'), 'date input').to.have.value('2022-02-28');
    });

    it('calls @onInput on input events', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        const inputSpy = sinon.spy();
        this.set('onInput', inputSpy);

        await render(hbs`<GhDatePicker @value={{this.date}} @onInput={{this.onInput}} />`);
        await typeIn('[data-test-date-picker-input]', 'lo');

        expect(inputSpy.callCount).to.equal(2);
        expect(inputSpy.firstCall.args[0]).to.be.instanceOf(Event);
    });

    it('calls @onKeydown on input keydown events', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        const keydownSpy = sinon.spy();
        this.set('onKeydown', keydownSpy);

        await render(hbs`<GhDatePicker @value={{this.date}} @onKeydown={{this.onKeydown}} />`);
        await typeIn('[data-test-date-picker-input]', 'lo');

        expect(keydownSpy.callCount).to.equal(2);
        expect(keydownSpy.firstCall.args[0]).to.be.instanceOf(Event);
    });

    it('calls @onBlur on input blur events', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        const blurSpy = sinon.spy();
        this.set('onBlur', blurSpy);

        await render(hbs`<GhDatePicker @value={{this.date}} @onBlur={{this.onBlur}} />`);
        await focus('[data-test-date-picker-input]');
        await blur('[data-test-date-picker-input]');

        expect(blurSpy.callCount).to.equal(1);
        expect(blurSpy.firstCall.args[0]).to.be.instanceOf(Event);
    });

    it('resets input value on Escape', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        const changeSpy = sinon.spy();
        this.set('onChange', changeSpy);

        await render(hbs`<GhDatePicker @value={{this.date}} @onChange={{this.onChange}} />`);
        await fillIn('[data-test-date-picker-input]', '2022-02-28');
        await triggerKeyEvent('[data-test-date-picker-input]', 'keydown', 'Escape');

        expect(changeSpy.callCount).to.equal(0);
        expect(find('[data-test-date-picker-input]')).to.have.value('2022-02-22');
    });

    it('handles invalid date input', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        const changeSpy = sinon.spy();
        this.set('onChange', changeSpy);

        const errorSpy = sinon.spy();
        this.set('onError', errorSpy);

        await render(hbs`<GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />`);
        await fillIn('[data-test-date-picker-input]', '2022-02-31');
        await blur('[data-test-date-picker-input]');

        expect(find('[data-test-date-picker-error]')).to.have.text('Invalid date');

        expect(changeSpy.callCount, '@onChange call count').to.equal(0);
        expect(errorSpy.callCount, '@onError call count').to.equal(1);
        expect(errorSpy.firstCall.args[0]).to.be.instanceof(Error);
        expect(errorSpy.firstCall.args[0].message).to.equal('Invalid date');
    });

    it('handles invalid date format input', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000')).toDate();

        const changeSpy = sinon.spy();
        this.set('onChange', changeSpy);

        const errorSpy = sinon.spy();
        this.set('onError', errorSpy);

        await render(hbs`<GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />`);
        await fillIn('[data-test-date-picker-input]', 'narp');
        await blur('[data-test-date-picker-input]');

        expect(find('[data-test-date-picker-error]')).to.contain.text('Date must be YYYY-MM-DD');

        expect(changeSpy.callCount, '@onChange call count').to.equal(0);
        expect(errorSpy.callCount, '@onError call count').to.equal(1);
        expect(errorSpy.firstCall.args[0]).to.be.instanceof(Error);
        expect(errorSpy.firstCall.args[0].message).to.contain('Date must be YYYY-MM-DD');
    });

    it('clears error on internal change to valid', async function () {
        await render(hbs`<GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />`);
        await fillIn('[data-test-date-picker-input]', 'narp');
        await blur('[data-test-date-picker-input]');

        expect(find('[data-test-date-picker-error]')).to.exist;

        await fillIn('[data-test-date-picker-input]', '2022-02-22');
        await blur('[data-test-date-picker-input]');

        expect(find('[data-test-date-picker-error]')).to.not.exist;
    });

    it('clears error on external @value change to valid', async function () {
        await render(hbs`<GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />`);
        await fillIn('[data-test-date-picker-input]', 'narp');
        await blur('[data-test-date-picker-input]');

        expect(find('[data-test-date-picker-error]')).to.exist;

        this.set('date', moment('2022-02-22'));

        expect(find('[data-test-date-picker-error]')).to.not.exist;
    });

    it('clears error on reset', async function () {
        await render(hbs`<GhDatePicker @value={{this.date}} @onChange={{this.onChange}} @onError={{this.onError}} />`);
        await fillIn('[data-test-date-picker-input]', 'narp');
        await blur('[data-test-date-picker-input]');

        expect(find('[data-test-date-picker-error]')).to.exist;

        await triggerKeyEvent('[data-test-date-picker-input]', 'keydown', 'Escape');

        expect(find('[data-test-date-picker-error]')).to.not.exist;
    });

    describe('min/max', function () {
        it('disables datepicker dates outside of range', async function () {
            this.set('date', moment('2022-02-22 22:22:22.000')).toDate();
            this.set('minDate', moment('2022-02-11 12:00:00.000').toDate());
            this.set('maxDate', moment('2022-02-24 12:00:00.000').toDate());

            await render(hbs`<GhDatePicker @value={{this.date}} @minDate={{this.minDate}} @maxDate={{this.maxDate}} />`);
            await click('[data-test-date-picker-trigger]');

            expect(find('[data-date="2022-02-10"]')).to.have.attribute('disabled');
            expect(find('[data-date="2022-02-25"]')).to.have.attribute('disabled');
        });

        it('errors when date input is earlier than min', async function () {
            this.set('date', moment('2022-02-22 22:22:22.000')).toDate();
            this.set('minDate', moment('2022-02-11 12:00:00.000').toDate());

            const changeSpy = sinon.spy();
            this.set('onChange', changeSpy);

            const errorSpy = sinon.spy();
            this.set('onError', errorSpy);

            await render(hbs`<GhDatePicker @value={{this.date}} @minDate={{this.minDate}} @onChange={{this.onChange}} @onError={{this.onError}} />`);
            await fillIn('[data-test-date-picker-input]', '2022-02-10');
            await blur('[data-test-date-picker-input]');

            expect(find('[data-test-date-picker-error]')).to.have.text('Must be on or after 2022-02-11');

            expect(changeSpy.callCount, '@onChange call count').to.equal(0);
            expect(errorSpy.callCount, '@onError call count').to.equal(1);
            expect(errorSpy.firstCall.args[0]).to.be.instanceof(Error);
            expect(errorSpy.firstCall.args[0].message).to.equal('Must be on or after 2022-02-11');
            expect(errorSpy.firstCall.args[0].date).to.be.equal('2022-02-10');
        });

        it('allows for min date error override', async function () {
            this.set('date', moment('2022-02-22 22:22:22.000')).toDate();
            this.set('minDate', moment('2022-02-11 12:00:00.000').toDate());

            await render(hbs`<GhDatePicker @value={{this.date}} @minDate={{this.minDate}} @minDateError="Must be in the future" @onChange={{this.onChange}} />`);

            await fillIn('[data-test-date-picker-input]', '2022-02-10');
            await blur('[data-test-date-picker-input]');

            expect(find('[data-test-date-picker-error]')).to.have.text('Must be in the future');
        });

        it('errors when date input is later than max', async function () {
            this.set('date', moment('2022-02-22 22:22:22.000')).toDate();
            this.set('maxDate', moment('2022-02-25 12:00:00.000').toDate());

            const changeSpy = sinon.spy();
            this.set('onChange', changeSpy);

            const errorSpy = sinon.spy();
            this.set('onError', errorSpy);

            await render(hbs`<GhDatePicker @value={{this.date}} @maxDate={{this.maxDate}} @onChange={{this.onChange}} @onError={{this.onError}} />`);
            await fillIn('[data-test-date-picker-input]', '2022-02-28');
            await blur('[data-test-date-picker-input]');

            expect(find('[data-test-date-picker-error]')).to.have.text('Must be on or before 2022-02-25');

            expect(changeSpy.callCount, '@onChange call count').to.equal(0);
            expect(errorSpy.callCount, '@onError call count').to.equal(1);
            expect(errorSpy.firstCall.args[0]).to.be.instanceof(Error);
            expect(errorSpy.firstCall.args[0].message).to.equal('Must be on or before 2022-02-25');
            expect(errorSpy.firstCall.args[0].date).to.be.equal('2022-02-28');
        });

        it('allows for max date error override', async function () {
            this.set('date', moment('2022-02-22 22:22:22.000')).toDate();
            this.set('maxDate', moment('2022-02-25 12:00:00.000').toDate());

            await render(hbs`<GhDatePicker @value={{this.date}} @maxDate={{this.maxDate}} @maxDateError="Must be in the past" @onChange={{this.onChange}} />`);

            await fillIn('[data-test-date-picker-input]', '2022-02-28');
            await blur('[data-test-date-picker-input]');

            expect(find('[data-test-date-picker-error]')).to.have.text('Must be in the past');
        });
    });

    describe('block invocation', function () {
        it('exposes Nav and Days components', async function () {
            clock = sinon.useFakeTimers({
                now: moment('2022-02-02 22:22:22.000').toDate()
            });

            this.set('date', moment('2022-02-02 22:22:22.000')).toDate();
            this.set('maxDate', moment('2022-02-05 12:00:00.000').toDate());

            await render(hbs`<GhDatePicker @value={{this.date}} @maxDate={{this.maxDate}} as |dp|><dp.Nav /><dp.Days /></GhDatePicker>`);

            await click('[data-test-date-picker-trigger]');

            // calendar is rendered with the right maxDate value curried
            expect(find('[data-date="2022-02-10"]')).to.have.attribute('disabled');
            expect(find('[data-date="2022-02-25"]')).to.have.attribute('disabled');
        });
    });
});
