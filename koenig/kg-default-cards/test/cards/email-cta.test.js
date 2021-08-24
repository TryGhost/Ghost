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
            .should.equal('<div><p>Plain html with no replacements</p></div>');
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

    it('renders nothing with no payload.html and no payload.button{Text,URL}', function () {
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

    it('renders button with no payload.html', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                html: undefined,
                showButton: true,
                buttonText: 'Click me!',
                buttonUrl: 'https://example.com'
            },
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<a href="https://example.com"');

        serializer.serialize(card.render(opts))
            .should.not.containEql('undefined');
    });

    it('does not render button with payload.showButton = false', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                html: undefined,
                showButton: false,
                buttonText: 'Click me!',
                buttonUrl: 'https://example.com'
            },
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.not.containEql('<a href="https://example.com"');
    });

    it('does not render button if payload.buttonText is missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                html: '',
                showButton: true,
                buttonText: '',
                buttonUrl: 'https://example.com'
            },
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.not.containEql('<a href="https://example.com"');
    });

    it('does not render button if payload.buttonUrl is missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                html: '',
                showButton: true,
                buttonText: 'Click me!',
                buttonUrl: ''
            },
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.not.containEql('<a href="https://example.com"');
    });

    it('wraps in div with data-gh-segment attribute', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                html: '<p>Plain html with no replacements</p>',
                segment: 'status:paid'
            },
            options: {
                target: 'email'
            }
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<div data-gh-segment="status:paid"');
    });

    it('wraps {foo} in %%', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<p>Testing %%{foo}%% in %%{bar}%%</p>');
    });

    it('wraps {foo, "test"} in %%', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo, "replacement fallbacks"} in {bar, "email card"}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<p>Testing %%{foo, "replacement fallbacks"}%% in %%{bar, "email card"}%%</p>');
    });

    it('wraps {foo,  "test"} (extra spaces)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo,  "valid"}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<p>Testing %%{foo,  "valid"}%%</p>');
    });

    it('wraps {foo "value"} (missing comma)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo "valid"} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<p>Testing %%{foo "valid"}%% in %%{bar}%%</p>');
    });

    it('wraps {foo  "invalid"} (missing comma, extra spaces)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo  "valid"} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<p>Testing %%{foo  "valid"}%% in %%{bar}%%</p>');
    });

    it('does not wrap {invalid } (invalid whitespace)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {invalid } in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<p>Testing {invalid } in %%{bar}%%</p>');
    });

    it('does not wrap { invalid} (invalid whitespace)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing { invalid} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<p>Testing { invalid} in %%{bar}%%</p>');
    });

    it('does not wrap {foo invalid} (missing quotes)', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo invalid} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.containEql('<p>Testing {foo invalid} in %%{bar}%%</p>');
    });

    it('renders dividers', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo invalid} in {bar}</p>', showDividers: true},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts)).match(/<hr>/g).length.should.eql(2);
    });

    it('renders no dividers by default', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {html: '<p>Testing {foo invalid} in {bar}</p>'},
            options: {target: 'email'}
        };

        serializer.serialize(card.render(opts))
            .should.not.containEql('<hr>');
    });
});
