import assert from 'assert';
import {Greeting} from './example.entity';

describe('ExampleEntity (Greeting)', function () {
    it('Can greet someone', function () {
        const entity = new Greeting({
            greeting: 'Bonjour'
        });
        const msg = entity.greet('Margot');
        assert.equal(msg, 'Bonjour, Margot.');
    });
    it('Has a custom greeting for the recipient "world"', function () {
        const entity = new Greeting({
            greeting: 'Bonjour'
        });
        const msg = entity.greet('world');
        assert.equal(msg, 'Hello, world!');
    });
    it('Can have its greeting updated', function () {
        const entity = new Greeting({
            greeting: 'Bonjour'
        });
        entity.greeting = 'Evening';
        const msg = entity.greet('Guvner');
        assert.equal(msg, 'Evening, Guvner.');
    });
});
