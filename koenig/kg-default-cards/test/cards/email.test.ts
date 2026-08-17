import card from '../../src/cards/email.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('Email card', function () {
    it('renders html with no replacements', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Plain html with no replacements</p>'},
            options: {
                target: 'email'
            }
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('<p>Plain html with no replacements</p>');
    });

    it('renders nothing if target is not email', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Plain html with no replacements</p>'},
            options: {
                target: 'html'
            }
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('');
    });

    it('renders nothing with no payload.html', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {},
            options: {
                target: 'email'
            }
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('');
    });

    it('wraps {foo} in %%', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Testing {foo} in {bar}</p>'},
            options: {target: 'email'}
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('<p>Testing %%{foo}%% in %%{bar}%%</p>');
    });

    it('wraps {foo, "test"} in %%', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Testing {foo, "replacement fallbacks"} in {bar, "email card"}</p>'},
            options: {target: 'email'}
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('<p>Testing %%{foo, "replacement fallbacks"}%% in %%{bar, "email card"}%%</p>');
    });

    it('wraps {foo,  "test"} (extra spaces)', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Testing {foo,  "valid"}</p>'},
            options: {target: 'email'}
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('<p>Testing %%{foo,  "valid"}%%</p>');
    });

    it('wraps {foo "value"} (missing comma)', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Testing {foo "valid"} in {bar}</p>'},
            options: {target: 'email'}
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('<p>Testing %%{foo "valid"}%% in %%{bar}%%</p>');
    });

    it('wraps {foo  "invalid"} (missing comma, extra spaces)', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Testing {foo  "valid"} in {bar}</p>'},
            options: {target: 'email'}
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('<p>Testing %%{foo  "valid"}%% in %%{bar}%%</p>');
    });

    it('does not wrap {invalid } (invalid whitespace)', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Testing {invalid } in {bar}</p>'},
            options: {target: 'email'}
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('<p>Testing {invalid } in %%{bar}%%</p>');
    });

    it('does not wrap { invalid} (invalid whitespace)', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Testing { invalid} in {bar}</p>'},
            options: {target: 'email'}
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('<p>Testing { invalid} in %%{bar}%%</p>');
    });

    it('does not wrap {foo invalid} (missing quotes)', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {html: '<p>Testing {foo invalid} in {bar}</p>'},
            options: {target: 'email'}
        };

        expect(serializer.serialize(card.render(opts)))
            .toBe('<p>Testing {foo invalid} in %%{bar}%%</p>');
    });
});
