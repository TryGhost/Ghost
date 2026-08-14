import assert from 'node:assert/strict';
import {errify} from '../../../core/shared/errify';

const assertError = (value: unknown, expectedMessage: string) => {
    assert(value instanceof Error);
    assert.equal(value.message, expectedMessage);
};

describe('errify', function () {
    it('returns the value unchanged if it is already an error', function () {
        const error = new Error('Test error');
        assert.equal(errify(error), error);
    });

    it('returns the value unchanged if it is an error subclass', function () {
        class CustomError extends Error {}
        const error = new CustomError('Test error');
        assert.equal(errify(error), error);
    });

    it('converts null to an error with no message', function () {
        assertError(errify(null), '');
    });

    it('converts undefined to an error with no message', function () {
        assertError(errify(undefined), '');
    });

    it('converts strings to errors with the string as the message', function () {
        assertError(errify('Test error'), 'Test error');
    });

    it('converts other primitive types to an error with their values stringified', function () {
        assertError(errify(false), 'false');
        assertError(errify(42), '42');
        assertError(errify(42n), '42');
        assertError(errify(Symbol('test')), 'Symbol(test)');
    });

    it('converts objects with messages to errors with the message property as the message', function () {
        assertError(errify({message: 'Test error'}), 'Test error');
        assertError(errify({message: 42}), '42');
    });

    it('does not use nested message properties', function () {
        assertError(errify({message: {message: 'Test error'}}), '[object Object]');
    });

    it('converts objects without messages to errors with the object stringified as the message', function () {
        assertError(errify({foo: 'bar'}), '[object Object]');
        assertError(errify(Object.create(null)), '[object Object]');
        assertError(errify([1, 2, 3]), '1,2,3');
        assertError(errify({[Symbol.toPrimitive]: () => 'test'}), 'test');
        assertError(errify({toString: () => 'test'}), 'test');
    });

    it('handles failures to convert to string gracefully', function () {
        const explode = () => {
            assert.fail('Failed to convert');
        };
        assertError(errify({[Symbol.toPrimitive]: explode}), '[object Object]');
        assertError(errify({toString: explode}), '[object Object]');
    });

    it('handles strange objects with circular messages', function () {
        const obj: Record<string, unknown> = {};
        obj.message = obj;
        assertError(errify(obj), '[object Object]');
    });
});
