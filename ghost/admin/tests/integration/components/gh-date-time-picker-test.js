import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import moment from 'moment-timezone';
import sinon from 'sinon';
import {blur, click, fillIn, find, render} from '@ember/test-helpers';
import {datepickerSelect} from 'ember-power-datepicker/test-support';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

let timezone = 'UTC';
class SettingsStub extends Service {
    get timezone() {
        return timezone;
    }

    get(key) {
        if (key === 'timezone') {
            return timezone;
        }
    }
}

describe('Integration: Component: gh-date-time-picker', function () {
    setupRenderingTest();
    let clock;

    beforeEach(async function () {
        timezone = 'UTC';
        this.owner.register('service:settings', SettingsStub);
    });

    afterEach(function () {
        clock?.restore();
    });

    it('renders', async function () {
        await render(hbs`<GhDateTimePicker />`);
        expect(find('[data-test-component="gh-date-time-picker"]'), 'component wrapper').to.exist;
        expect(find('[data-test-date-time-picker-datepicker]'), 'datepicker trigger').to.exist;
        expect(find('[data-test-date-time-picker-date-input]'), 'datepicker input').to.exist;
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.exist;
        expect(find('[data-test-date-time-picker-timezone]')).to.contain.text('UTC');
    });

    it('defaults to now when @date is empty', async function () {
        clock = sinon.useFakeTimers({
            now: moment('2022-02-22 22:22:22.000Z').toDate()
        });

        await render(hbs`<GhDateTimePicker />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('22:22');
    });

    it('shows passed in @date value', async function () {
        this.set('date', '2022-02-22 22:22');

        await render(hbs`<GhDateTimePicker @date={{this.date}} />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('22:22');
    });

    it('uses separate @time value', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
        this.set('time', '12:00');

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');
    });

    it('can update date via date input', async function () {
        this.set('date','2022-02-22');
        this.set('time', '22:22'); // = blog timezone

        this.set('updateDate', (newDate) => {
            // Note: the newDate should be 2022-02-28 in the current blog timezone, this is not the same timezone as the user timezone
            // Blog timezone is UTC, so ending of Z is needed here
            expect(moment.utc(newDate).toISOString()).to.equal('2022-02-28T00:00:00.000Z');
            this.set('date', newDate);
        });
        this.set('updateTime', (newTime) => {
            expect(newTime).to.equal('22:22');
            this.set('time', newTime);
        });

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
        await fillIn('[data-test-date-time-picker-date-input]', '2022-02-28');
        await blur('[data-test-date-time-picker-date-input]');
    });

    it('can update date via date input with +12 timezone', async function () {
        timezone = 'Pacific/Kwajalein'; // +12

        // Current date/time doesn't really matter
        this.set('date','2022-02-22');
        this.set('time', '22:22');

        this.set('updateDate', (newDate) => {
            // Note: the newDate should be 2022-02-28 in the current blog timezone, this is not the same timezone as the user timezone
            // Blog timezone is +12
            expect(moment.utc(newDate).toISOString()).to.equal('2022-02-27T12:00:00.000Z');
            this.set('date', newDate);
        });

        this.set('updateTime', (newTime) => {
            expect(newTime).to.equal('22:22');
            this.set('time', newTime);
        });

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
        
        // We enter 2022-02-28. In UTC this is 2022-02-28 00:00:00.000Z. But we should call updateDate to be 2022-02-28 in the blog timezone
        await fillIn('[data-test-date-time-picker-date-input]', '2022-02-28');
        await blur('[data-test-date-time-picker-date-input]');
    });

    it('can update time via time input', async function () {
        this.set('date', '2022-02-22');
        this.set('time', '22:22');

        this.set('updateDate', (newDate) => {
            expect(moment.utc(newDate).toISOString()).to.equal('2022-02-28T00:00:00.000');
            this.set('date', newDate);
        });
        this.set('updateTime', (newTime) => {
            expect(newTime).to.equal('18:00');
            this.set('time', newTime);
        });

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
        await fillIn('[data-test-date-time-picker-time-input]', '18:00');
        await blur('[data-test-date-time-picker-time-input]');
    });

    it('can update date via datepicker', async function () {
        this.set('date', '2022-02-22');
        this.set('time', '12:00');

        this.set('updateDate', (newDate) => {
            expect(moment.utc(newDate).toISOString()).to.equal('2022-02-27T00:00:00.000Z');
            this.set('date', newDate);
        });
        this.set('updateTime', (newTime) => {
            expect(newTime).to.equal('12:00');
            this.set('time', newTime);
        });

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
        await datepickerSelect('[data-test-date-time-picker-datepicker]', moment('2022-02-27T13:00:00.000Z').toDate());
    });

    it('can update date via datepicker with +12 timezone', async function () {
        timezone = 'Pacific/Kwajalein'; // +12

        this.set('date', '2022-02-22');
        this.set('time', '12:00');

        this.set('updateDate', (newDate) => {
            // 12 hours earlier in UTC
            expect(moment.utc(newDate).toISOString()).to.equal('2022-02-26T12:00:00.000Z');
            this.set('date', newDate);
        });
        this.set('updateTime', (newTime) => {
            expect(newTime).to.equal('12:00');
            this.set('time', newTime);
        });

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
        await datepickerSelect('[data-test-date-time-picker-datepicker]', moment('2022-02-27T13:00:00.000Z').toDate());
    });

    it('updates when @date is changed externally', async function () {
        this.set('date','2022-02-22');
        this.set('time', '12:00');

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');

        this.set('date', '2022-02-28');

        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-28');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');
    });

    it('updates when @date is changed externally with +12 timezone', async function () {
        timezone = 'Pacific/Kwajalein'; // +12

        this.set('date','2022-02-22');
        this.set('time', '12:00');

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');

        this.set('date', '2022-02-28');

        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-28');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');
    });

    it('updates when @date is changed externally with -11 timezone', async function () {
        timezone = 'Pacific/Pago_Pago'; // -11

        this.set('date','2022-02-22');
        this.set('time', '12:00');

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');

        this.set('date', '2022-02-28');

        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-28');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');
    });

    it('updates when @time is changed externally', async function () {
        this.set('date', '2022-02-22');
        this.set('time', '12:00');

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');

        this.set('time', '08:00');

        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('08:00');
    });

    it('handles invalid date input', async function () {
        this.set('date', '2022-02-22');
        this.set('time', '12:00');

        const dateSpy = sinon.spy();
        this.set('updateDate', dateSpy);

        const timeSpy = sinon.spy();
        this.set('updateTime', timeSpy);

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
        await fillIn('[data-test-date-time-picker-date-input]', '2022-02-31');
        await blur('[data-test-date-time-picker-date-input]');

        expect(find('[data-test-date-time-picker-error]')).to.have.text('Invalid date');

        await fillIn('[data-test-date-time-picker-date-input]', 'narp');
        await blur('[data-test-date-time-picker-date-input]');

        expect(find('[data-test-date-time-picker-error]')).to.contain.text('Invalid date format');

        expect(dateSpy.callCount, '@setDate call count').to.equal(0);
        expect(timeSpy.callCount, '@setTime call count').to.equal(0);
    });

    // TODO: move time format handling into component?
    // it('handles invalid time input', async function () {
    //     this.set('date', '2022-02-22');
    //     this.set('time', '12:00');

    //     const dateSpy = sinon.spy();
    //     this.set('updateDate', dateSpy);

    //     const timeSpy = sinon.spy();
    //     this.set('updateTime', timeSpy);

    //     await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
    //     await fillIn('[data-test-date-time-picker-time-input]', '24:59');
    //     await blur('[data-test-date-time-picker-time-input]');

    //     expect(dateSpy.callCount, '@setDate call count').to.equal(0);
    //     expect(timeSpy.callCount, '@setTime call count').to.equal(0);

    //     expect(find('[data-test-date-time-picker-error]')).to.have.text('Invalid time');

    //     await fillIn('[data-test-date-time-picker-time-input]', 'narp');
    //     await blur('[data-test-date-time-picker-time-input]');

    //     expect(find('[data-test-date-time-picker-error]')).to.contain.text('Invalid time format');
    // });

    describe('min/max', function () {
        it('disables datepicker dates outside of range', async function () {
            this.set('date', '2022-02-22');
            this.set('time', '12:00');
            this.set('minDate', moment('2022-02-11 12:00:00.000').toDate());
            this.set('maxDate', moment('2022-02-24 12:00:00.000').toDate());

            await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @minDate={{this.minDate}} @maxDate={{this.maxDate}} />`);
            await click('[data-test-date-time-picker-datepicker]');

            expect(find('[data-date="2022-02-10"]')).to.have.attribute('disabled');
            expect(find('[data-date="2022-02-25"]')).to.have.attribute('disabled');
        });

        it('Handles timezone of minimum date correctly', async function () {
            clock = sinon.useFakeTimers({
                now: moment('2022-01-01 10:00:00.000Z').toDate()
            });

            // Blog timezone is -11, so current date over there is 2021-12-31
            timezone = 'Pacific/Pago_Pago'; // GMT-11

            this.set('date', '2021-12-31');
            this.set('time', '22:00');
            this.set('minDate', 'now');

            await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @minDate={{this.minDate}} />`);
            await click('[data-test-date-time-picker-datepicker]');

            expect(find('[data-date="2021-12-30"]')).to.have.attribute('disabled');
            expect(find('[data-date="2021-12-31"]')).not.to.have.attribute('disabled');
        });

        it('Handles timezone of maximum date correctly', async function () {
            clock = sinon.useFakeTimers({
                now: moment('2021-12-31 10:00:00.000Z').toDate()
            });

            // Blog timezone is -11, so current date over there is 2021-12-30
            timezone = 'Pacific/Pago_Pago'; // GMT-11

            this.set('date', '2021-12-30');
            this.set('time', '22:00');
            this.set('maxDate', 'now');

            await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @maxDate={{this.maxDate}} />`);
            await click('[data-test-date-time-picker-datepicker]');
            expect(find('[data-date="2021-12-30"]')).not.to.have.attribute('disabled');
            expect(find('[data-date="2021-12-31"]')).to.have.attribute('disabled');
        });

        // TODO: move date validation into component?
        // it('errors when date input is earlier than min', async function () {
        //     this.set('date', moment('2022-02-22 22:22:22.000')).toDate();
        //     this.set('time', '12:00');
        //     this.set('minDate', moment('2022-02-11 12:00:00.000').toDate());

        //     const dateSpy = sinon.spy();
        //     this.set('updateDate', dateSpy);

        //     const timeSpy = sinon.spy();
        //     this.set('updateTime', timeSpy);

        //     await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @minDate={{this.minDate}} @setDate={{this.updateDate}} @setTime={{this.updateTime}} />`);
        //     await fillIn('[data-test-date-time-picker-date-input]', '2022-02-10');
        //     await blur('[data-test-date-time-picker-date-input]');

        //     expect(dateSpy.callCount, '@setDate call count').to.equal(0);
        //     expect(timeSpy.callCount, '@setTime call count').to.equal(0);
        // });

        // it('errors when date input is later than max');
        // it('errors when time input is earlier than min');
        // it('errors when time input is later than max');
    });
});
