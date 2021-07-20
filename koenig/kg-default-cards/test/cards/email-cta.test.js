// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/email-cta');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Email CTA card', function () {
    it('renders html with no replacements', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Plain html with no replacements</p>'},
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Plain html with no replacements</p>');
    });

    it('renders nothing if target is not email', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Plain html with no replacements</p>'},
            options: {
                target: 'html'
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('');
    });

    it('renders nothing with no payload.html', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {},
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('');
    });

    it('wraps in segment div when segment payload present renders html with no replacements', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                html: '<p>Plain html with no replacements</p>',
                segment: 'member.status:paid'
            },
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('<div data-gh-segment="member.status:paid"><p>Plain html with no replacements</p></div>');
    });

    it('wraps {foo} in %%', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing %%{foo}%% in %%{bar}%%</p>');
    });

    it('wraps {foo, "test"} in %%', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo, "replacement fallbacks"} in {bar, "email card"}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing %%{foo, "replacement fallbacks"}%% in %%{bar, "email card"}%%</p>');
    });

    it('wraps {foo,  "test"} (extra spaces)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo,  "valid"}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing %%{foo,  "valid"}%%</p>');
    });

    it('wraps {foo "value"} (missing comma)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo "valid"} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing %%{foo "valid"}%% in %%{bar}%%</p>');
    });

    it('wraps {foo  "invalid"} (missing comma, extra spaces)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo  "valid"} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing %%{foo  "valid"}%% in %%{bar}%%</p>');
    });

    it('does not wrap {invalid } (invalid whitespace)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {invalid } in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing {invalid } in %%{bar}%%</p>');
    });

    it('does not wrap { invalid} (invalid whitespace)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing { invalid} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing { invalid} in %%{bar}%%</p>');
    });

    it('does not wrap {foo invalid} (missing quotes)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo invalid} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing {foo invalid} in %%{bar}%%</p>');
    });
});
