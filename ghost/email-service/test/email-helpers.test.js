const assert = require('assert/strict');
const {registerHelpers} = require('../lib/helpers/register-helpers');

// load the i18n module
const i18nLib = require('@tryghost/i18n');
const i18n = i18nLib('fr', 'newsletter');

const t = (key, options) => {
    return i18n.t(key, options);
};

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
    it('t helper returns key', function () {
        const labs = {
            isSet: function () {
                return false;
            }
        };
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('test');
        assert.equal(result, 'test');
    });
    it('t helper returns translation', function () {
        const labs = {
            isSet: function () {
                return false;
            }
        };
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('Name');
        assert.equal(result, 'Nom');
    });
    it('t helper returns translation with hash', function () {
        const labs = {
            isSet: function () {
                return false;
            }
        };
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('By {authors}', {hash: {authors: 'fred'}});
        assert.equal(result, 'Par fred');
    });
    it('t helper returns translation with options', function () {
        const labs = {
            isSet: function () {
                return false;
            }
        };
        const handlebars = {
            registerHelper: function (name, fn) {
                this[name] = fn;
            }
        };

        registerHelpers(handlebars, labs, t);

        const result = handlebars.t('By {authors}', {authors: 'fred'});
        assert.equal(result, 'Par fred');
    });
});
