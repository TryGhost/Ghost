const assert = require('node:assert/strict');
const Handlebars = require('handlebars');
const {registerHelpers} = require('../../../../../core/server/services/email-service/helpers/register-helpers');

// load the i18n module
const i18nLib = require('@tryghost/i18n');
const i18n = i18nLib('fr', 'ghost');

const t = (key, options) => {
    return i18n.t(key, options);
};

// Handlebars stand-in that records registered helpers as direct properties
// so tests can invoke them, plus the real SafeString the `t` helper needs.
function makeHandlebarsMock() {
    return {
        registerHelper(name, fn) {
            this[name] = fn;
        },
        SafeString: Handlebars.SafeString
    };
}

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
        assert.ok(handlebars.t);
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

    it('hasFeature helper returns true when any flag is set', function () {
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };
        const labs = {
            isSet: function (flag) {
                return flag === 'flag2'; // Only flag2 is set
            }
        };
        registerHelpers(handlebars, labs);

        const options = {
            fn: function () {
                return true;
            },
            inverse: function () {
                return false;
            }
        };

        const result = handlebars.hasFeature('flag1', 'flag2', 'flag3', options);

        assert.equal(result, true);
    });

    it('hasFeature helper returns false when no flags are set', function () {
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

        const options = {
            fn: function () {
                return true;
            },
            inverse: function () {
                return false;
            }
        };

        const result = handlebars.hasFeature('flag1', 'flag2', 'flag3', options);

        assert.equal(result, false);
    });

    it('t helper returns key', function () {
        const labs = {isSet: () => false};
        const handlebars = makeHandlebarsMock();

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('test');
        assert.ok(result instanceof Handlebars.SafeString);
        assert.equal(result.toString(), 'test');
    });
    it('t helper returns translation', function () {
        const labs = {isSet: () => false};
        const handlebars = makeHandlebarsMock();

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('Name');
        assert.equal(result.toString(), 'Nom');
    });
    it('t helper returns translation with hash', function () {
        const labs = {isSet: () => false};
        const handlebars = makeHandlebarsMock();

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('By {authors}', {hash: {authors: 'fred'}});
        assert.equal(result.toString(), 'Par fred');
    });
    it('t helper returns translation with options', function () {
        const labs = {isSet: () => false};
        const handlebars = makeHandlebarsMock();

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('By {authors}', {authors: 'fred'});
        assert.equal(result.toString(), 'Par fred');
    });

    // Refs https://github.com/TryGhost/Ghost/issues/26905
    it('t helper returns a SafeString so double-brace does not re-escape', function () {
        const labs = {isSet: () => false};
        const handlebars = makeHandlebarsMock();

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('By {authors}', {hash: {authors: 'Author/Name'}});
        assert.ok(result instanceof Handlebars.SafeString);
        assert.ok(result.toString().includes('&#x2F;'), 'i18next still encodes / at the helper boundary');
        assert.equal(result.toString().includes('&amp;#x2F;'), false, 'must not be double-encoded');
    });

    it('t helper does not double-encode apostrophes or ampersands in interpolated values', function () {
        const labs = {isSet: () => false};
        const handlebars = makeHandlebarsMock();

        registerHelpers(handlebars, labs, t);

        const apostrophe = handlebars.t('By {authors}', {hash: {authors: 'O\'Brien'}}).toString();
        assert.equal(apostrophe.includes('&amp;#39;'), false);
        assert.ok(apostrophe.includes('O&#39;Brien'));

        const ampersand = handlebars.t('By {authors}', {hash: {authors: 'Sam & Co.'}}).toString();
        assert.ok(ampersand.includes('Sam &amp; Co.'));
        assert.equal(ampersand.includes('&amp;amp;'), false);
    });

    it('t helper escapes HTML in interpolated values so triple-brace use is XSS-safe', function () {
        const labs = {isSet: () => false};
        const handlebars = makeHandlebarsMock();

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('By {authors}', {hash: {authors: '<script>alert(1)</script>'}}).toString();
        assert.equal(result.includes('<script>'), false);
        assert.ok(result.includes('&lt;script&gt;'));
    });
});
