// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/email');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe.only('Email card', function () {
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

    it('replaces {foo} with matching content', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo} in {bar}</p>'},
            options: {
                target: 'email',
                replacementMap: {
                    foo: 'replacements',
                    bar: 'email card'
                }
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing replacements in email card</p>');
    });

    it('replaces {foo, "test"} with fallback with no matching content', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo, "replacement fallbacks"} in {bar, "email card"}</p>'},
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing replacement fallbacks in email card</p>');
    });

    it('removes {foo} with no matching content', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo} in {bar}</p>'},
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing  in </p>');
    });

    it('keeps {invalid } (invalid whitespace)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo } in {bar}</p>'},
            options: {
                target: 'email',
                replacementMap: {
                    foo: 'replacements',
                    bar: 'email card'
                }
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing {foo } in email card</p>');
    });

    it('keeps {foo invalid} (missing comma and quotes)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo invalid} in {bar}</p>'},
            options: {
                target: 'email',
                replacementMap: {
                    foo: 'replacements',
                    bar: 'email card'
                }
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing {foo invalid} in email card</p>');
    });

    it('keeps {foo "invalid"} (missing comma)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo "invalid"} in {bar}</p>'},
            options: {
                target: 'email',
                replacementMap: {
                    foo: 'replacements',
                    bar: 'email card'
                }
            }
        };

        serializer.serialize(card.render(opts))
            .should.equal('<p>Testing {foo "invalid"} in email card</p>');
    });
});
