import {getOwn} from '../src/utils/get-own';

describe('getOwn', () => {
    class Person {
        name: string;
        constructor(name: string) {
            this.name = name;
        }
        getName() {
            return this.name;
        }
    }

    const obj: Record<string, unknown> = {foo: 'bar'};
    const person = new Person('McCoo');

    test('getting "own" properties', () => {
        expect(getOwn(obj, 'foo')).toBe('bar');
        expect(getOwn(person, 'name')).toBe('McCoo');
    });

    test('ignoring inherited properties', () => {
        expect(getOwn(obj, 'baz')).toBeUndefined();
        expect(getOwn(obj, 'hasOwnProperty')).toBeUndefined();
        expect(getOwn(person, 'getName')).toBeUndefined();
    });
});