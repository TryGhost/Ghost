import EmberObject from '@ember/object';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {
    describe,
    it
} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';

const Subscriber = EmberObject.extend(ValidationEngine, {
    validationType: 'subscriber',

    email: null
});

describe('Unit: Validator: subscriber', function () {
    it('validates email by default', function () {
        let subscriber = Subscriber.create({});
        let properties = subscriber.get('validators.subscriber.properties');

        expect(properties, 'properties').to.include('email');
    });

    it('passes with a valid email', function () {
        let subscriber = Subscriber.create({email: 'test@example.com'});
        let passed = false;

        run(() => {
            subscriber.validate({property: 'email'}).then(() => {
                passed = true;
            });
        });

        expect(passed, 'passed').to.be.true;
        expect(subscriber.get('hasValidated'), 'hasValidated').to.include('email');
    });

    it('validates email presence', function () {
        let subscriber = Subscriber.create({});
        let passed = false;

        run(() => {
            subscriber.validate({property: 'email'}).then(() => {
                passed = true;
            });
        });

        let emailErrors = subscriber.get('errors').errorsFor('email').get(0);
        expect(emailErrors.attribute, 'errors.email.attribute').to.equal('email');
        expect(emailErrors.message, 'errors.email.message').to.equal('Please enter an email.');

        expect(passed, 'passed').to.be.false;
        expect(subscriber.get('hasValidated'), 'hasValidated').to.include('email');
    });

    it('validates email', function () {
        let subscriber = Subscriber.create({email: 'foo'});
        let passed = false;

        run(() => {
            subscriber.validate({property: 'email'}).then(() => {
                passed = true;
            });
        });

        let emailErrors = subscriber.get('errors').errorsFor('email').get(0);
        expect(emailErrors.attribute, 'errors.email.attribute').to.equal('email');
        expect(emailErrors.message, 'errors.email.message').to.equal('Invalid email.');

        expect(passed, 'passed').to.be.false;
        expect(subscriber.get('hasValidated'), 'hasValidated').to.include('email');
    });
});
