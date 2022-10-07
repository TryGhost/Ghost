import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import moment from 'moment-timezone';
import sinon from 'sinon';
import {blur, click, fillIn, find, render} from '@ember/test-helpers';
import {datepickerSelect} from 'ember-power-datepicker/test-support';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

const BLOG_TIMEZONE = 'Etc/UTC';

class SettingsStub extends Service {
    timezone = BLOG_TIMEZONE;

    get(key) {
        if (key === 'timezone') {
            return this.timezone;
        }
    }
}

const toBlogTime = aMoment => aMoment.clone().tz(BLOG_TIMEZONE);

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
        expect(find('[data-test-date-time-picker-timezone]')).to.contain.text(moment.utc().tz(BLOG_TIMEZONE).format('z'));
    });

    it('defaults to now when @date is empty', async function () {
        const momentToTest = moment('2022-02-22 22:22:22.000Z');
        clock = sinon.useFakeTimers({
            now: momentToTest.toDate()
        });

        await render(hbs`<GhDateTimePicker />`);
        expect(find('[data-test-date-time-picker-date-input]'), 'date input')
            .to
            .have
            .value(toBlogTime(momentToTest).format('YYYY-MM-DD'));

        expect(find('[data-test-date-time-picker-time-input]'), 'time input')
            .to
            .have
            .value(toBlogTime(momentToTest).format('HH:mm'));
    });

    it('shows passed in @date value', async function () {
        const momentToTest = moment('2022-02-22 22:22:22.000Z');
        this.set('date', toBlogTime(momentToTest).format('YYYY-MM-DD'));

        await render(hbs`<GhDateTimePicker @date={{this.date}} />`);
        
        expect(find('[data-test-date-time-picker-date-input]'), 'date input')
            .to
            .have
            .value(toBlogTime(momentToTest).format('YYYY-MM-DD'));
        
        expect(find('[data-test-date-time-picker-time-input]'), 'time input')
            .to
            .have
            .value('00:00');
    });

    it('shows passed in @date and @time values', async function () {
        const momentToTest = moment('2022-02-22 22:22:22.000Z');
        this.set('date', toBlogTime(momentToTest).format('YYYY-MM-DD'));
        this.set('time', toBlogTime(momentToTest).format('HH:mm'));

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);
        
        expect(find('[data-test-date-time-picker-date-input]'), 'date input')
            .to
            .have
            .value(toBlogTime(momentToTest).format('YYYY-MM-DD'));

        expect(find('[data-test-date-time-picker-time-input]'), 'time input')
            .to
            .have
            .value(toBlogTime(momentToTest).format('HH:mm'));
    });

    it('can update date via date input', async function () {
        const initialMomentToTest = moment('2022-02-22 22:22:22.000Z');
        const updatedMomentToTest = moment('2022-02-28T00:00:00.000Z');

        this.set('date', toBlogTime(initialMomentToTest).format('YYYY-MM-DD'));
        this.set('time', toBlogTime(initialMomentToTest).format('HH:mm'));

        this.set('updateDate', (newDate) => {
            // Timezone part of the date is incorrect
            // It is the date inputed (so at blog TZ)
            // but with a timezone of local system
            // Only the date part is valid
            expect(moment(newDate).format('YYYY-MM-DD'))
                .to
                .equal(toBlogTime(updatedMomentToTest).format('YYYY-MM-DD'));
            
            this.set('date', newDate);
        });

        await render(hbs`<GhDateTimePicker 
            @date={{this.date}} 
            @time={{this.time}} 
            @setDate={{this.updateDate}}/>`);

        await fillIn('[data-test-date-time-picker-date-input]', toBlogTime(updatedMomentToTest).format('YYYY-MM-DD'));
        await blur('[data-test-date-time-picker-date-input]');
    });

    it('can update time via time input', async function () {
        const initialMomentToTest = moment('2022-02-22 22:22:22.000Z');
        const updatedMomentToTest = moment('2022-02-28T00:00:00.000Z');

        this.set('date', toBlogTime(initialMomentToTest).format('YYYY-MM-DD'));
        this.set('time', toBlogTime(initialMomentToTest).format('HH:mm'));

        this.set('updateTime', (newTime) => {
            expect(newTime)
                .to
                .equal(toBlogTime(updatedMomentToTest).format('HH:mm'));
            
            this.set('time', newTime);
        });

        await render(hbs`<GhDateTimePicker 
            @date={{this.date}} 
            @time={{this.time}} 
            @setTime={{this.updateTime}} />`);

        await fillIn('[data-test-date-time-picker-time-input]', toBlogTime(updatedMomentToTest).format('HH:mm'));
        await blur('[data-test-date-time-picker-time-input]');
    });

    it('can update date via datepicker', async function () {
        const initialMomentToTest = moment('2022-02-22 22:22:22.000Z');
        const updatedMomentToTest = moment('2022-02-28T00:00:00.000Z');

        this.set('date', toBlogTime(initialMomentToTest).format('YYYY-MM-DD'));
        this.set('time', toBlogTime(initialMomentToTest).format('HH:mm'));

        this.set('updateDate', (newDate) => {
            expect(moment(newDate).format('YYYY-MM-DD'))
                .to
                .equal(toBlogTime(updatedMomentToTest).format('YYYY-MM-DD'));

            this.set('date', newDate);
        });

        this.set('updateTime', (newTime) => {
            expect(newTime)
                .to
                .equal(toBlogTime(updatedMomentToTest).format('HH:mm'));

            this.set('time', newTime);
        });

        await render(hbs`<GhDateTimePicker 
            @date={{this.date}} 
            @time={{this.time}} 
            @setDate={{this.updateDate}} 
            @setTime={{this.updateTime}} />`);

        await datepickerSelect('[data-test-date-time-picker-datepicker]', toBlogTime(updatedMomentToTest).format('YYYY-MM-DD'));
    });

    it('updates when @date is changed externally', async function () {
        const initialMomentToTest = moment('2022-02-22 22:22:22.000Z');
        const updatedMomentToTest = moment('2022-02-28T00:00:00.000Z');

        this.set('date', toBlogTime(initialMomentToTest).format('YYYY-MM-DD'));
        this.set('time', toBlogTime(initialMomentToTest).format('HH:mm'));

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);

        this.set('date', toBlogTime(updatedMomentToTest).format('YYYY-MM-DD'));

        expect(find('[data-test-date-time-picker-date-input]'), 'date input')
            .to
            .have
            .value(toBlogTime(updatedMomentToTest).format('YYYY-MM-DD'));
        
        expect(find('[data-test-date-time-picker-time-input]'), 'time input')
            .to
            .have
            .value(toBlogTime(initialMomentToTest).format('HH:mm'));
    });

    it('updates when @time is changed externally', async function () {
        const initialMomentToTest = moment('2022-02-22 22:22:22.000Z');
        const updatedMomentToTest = moment('2022-02-28T00:00:00.000Z');

        this.set('date', toBlogTime(initialMomentToTest).format('YYYY-MM-DD'));
        this.set('time', toBlogTime(initialMomentToTest).format('HH:mm'));

        await render(hbs`<GhDateTimePicker @date={{this.date}} @time={{this.time}} />`);
        
        this.set('time', toBlogTime(updatedMomentToTest).format('HH:mm'));

        expect(find('[data-test-date-time-picker-date-input]'), 'date input')
            .to
            .have
            .value(toBlogTime(initialMomentToTest).format('YYYY-MM-DD'));
        
        expect(find('[data-test-date-time-picker-time-input]'), 'time input')
            .to
            .have
            .value(toBlogTime(updatedMomentToTest).format('HH:mm'));
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
