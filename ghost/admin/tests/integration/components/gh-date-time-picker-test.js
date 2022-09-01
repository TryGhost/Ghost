import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import moment from 'moment';
import sinon from 'sinon';
import {blur, click, fillIn, find, render} from '@ember/test-helpers';
import {datepickerSelect} from 'ember-power-datepicker/test-support';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

class SettingsStub extends Service {
    timezone = 'Etc/UTC';

    get(key) {
        if (key === 'timezone') {
            return this.timezone;
        }
    }
}

describe('Integration: Component: gh-date-time-picker', function () {
    setupRenderingTest();
    let clock;

    beforeEach(async function () {
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
        this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();

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
        this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
        this.set('time', '22:22');

        this.set('updateDate', (newDate) => {
            expect(moment(newDate).toISOString()).to.equal('2022-02-28T00:00:00.000Z');
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

    it('can update time via time input', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
        this.set('time', '22:22');

        this.set('updateDate', (newDate) => {
            expect(moment(newDate).toISOString()).to.equal('2022-02-28T00:00:00.000Z');
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
        this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
        this.set('time', '12:00');

        this.set('updateDate', (newDate) => {
            expect(moment(newDate).toISOString()).to.equal('2022-02-27T00:00:00.000Z');
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
        this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
        this.set('time', '12:00');

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');

        this.set('date', moment('2022-02-28 10:00:00.000Z')).toDate();

        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-28');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');
    });

    it('updates when @time is changed externally', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
        this.set('time', '12:00');

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('12:00');

        this.set('time', '08:00');

        expect(find('[data-test-date-time-picker-date-input]'), 'date input').to.have.value('2022-02-22');
        expect(find('[data-test-date-time-picker-time-input]'), 'time input').to.have.value('08:00');
    });

    it('handles invalid date input', async function () {
        this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
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
    //     this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
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
            this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
            this.set('time', '12:00');
            this.set('minDate', moment('2022-02-11 12:00:00.000Z').toDate());
            this.set('maxDate', moment('2022-02-24 12:00:00.000Z').toDate());

            await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} @minDate={{this.minDate}} @maxDate={{this.maxDate}} />`);
            await click('[data-test-date-time-picker-datepicker]');

            expect(find('[data-date="2022-02-10"]')).to.have.attribute('disabled');
            expect(find('[data-date="2022-02-25"]')).to.have.attribute('disabled');
        });

        // TODO: move date validation into component?
        // it('errors when date input is earlier than min', async function () {
        //     this.set('date', moment('2022-02-22 22:22:22.000Z')).toDate();
        //     this.set('time', '12:00');
        //     this.set('minDate', moment('2022-02-11 12:00:00.000Z').toDate());

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
