const assert = require('assert/strict');
const {registerHelpers} = require('../lib/helpers/register-helpers');

describe('registerHelpers', function () {
    it('registers helpers', function () {
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };
        const labs = {
            isSet: function () {
                return true;
            }
        };
        registerHelpers(handlebars, labs);

        assert.ok(handlebars.if);
        assert.ok(handlebars.and);
        assert.ok(handlebars.not);
        assert.ok(handlebars.or);
        assert.ok(handlebars.hasFeature);
    });

    it('if helper returns true', function () {
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };
        const labs = {
            isSet: function () {
                return true;
            }
        };
        registerHelpers(handlebars, labs);

        const result = handlebars.if(true, {
            fn: function () {
                return true;
            },
            inverse: function () {
                return false;
            }
        });

        assert.equal(result, true);
    });

    it('if helper returns false', function () {
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };
        const labs = {
            isSet: function () {
                return true;
            }
        };
        registerHelpers(handlebars, labs);

        const result = handlebars.if(false, {
            fn: function () {
                return true;
            },
            inverse: function () {
                return false;
            }
        });

        assert.equal(result, false);
    });

    it('and helper returns true', function () {
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };
        const labs = {
            isSet: function () {
                return true;
            }
        };
        registerHelpers(handlebars, labs);

        const result = handlebars.and(true, true);

        assert.equal(result, true);
    });

    it('hasFeature helper returns true', function () {
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };
        const labs = {
            isSet: function () {
                return true;
            }
        };
        registerHelpers(handlebars, labs);

        const result = handlebars.hasFeature('test', {
            fn: function () {
                return true;
            },
            inverse: function () {
                return false;
            }
        });

        assert.equal(result, true);
    });

    it('hasFeature helper returns false', function () {
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };
        const labs = {
            isSet: function () {
                return false;
            }
        };
        registerHelpers(handlebars, labs);

        const result = handlebars.hasFeature('test', {
            fn: function () {
                return true;
            },
            inverse: function () {
                return false;
            }
        });

        assert.equal(result, false);
    });

    it('avoidOrphanedWords helper', function () {
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            },
            escapeExpression(text) {
                return text;
            },
            SafeString: class SafeString {
                constructor(text) {
                    this.text = text;
                }
            }
        };

        registerHelpers(handlebars, {});

        const tests = [
            {input: null, expected: ''},
            {input: '', expected: ''},
            {input: 'One-word', expected: new handlebars.SafeString('One-word')},
            {input: 'Two words', expected: new handlebars.SafeString('Two&nbsp;words')}
        ];

        for (const test of tests) {
            const result = handlebars.avoidOrphanedWords(test.input);
            assert.deepEqual(result, test.expected);
        }
    });
});
