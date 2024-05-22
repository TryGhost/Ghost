require('./utils');
const security = require('../');

describe('Lib: Security - Secret', function () {
    it('generates a 13 byte secret if asked for a content secret', function () {
        let secret = security.secret.create('content');
        secret.should.be.a.String().with.lengthOf(13 * 2);
        secret.should.match(/[0-9a-z]+/);
    });

    it('generates a specific length secret if given a length', function () {
        let secret = security.secret.create(10);
        secret.should.be.a.String().with.lengthOf(10);
        secret.should.match(/[0-9a-z]+/);
    });

    it('generates a specific length secret if given a length even when odd', function () {
        let secret = security.secret.create(15);
        secret.should.be.a.String().with.lengthOf(15);
        secret.should.match(/[0-9a-z]+/);
    });

    it('generates a 32 byte secret if asked for an admin secret', function () {
        let secret = security.secret.create('admin');
        secret.should.be.a.String().with.lengthOf(32 * 2);
        secret.should.match(/[0-9a-z]+/);
    });

    it('generates a 32 byte secret by default', function () {
        let secret = security.secret.create();
        secret.should.be.a.String().with.lengthOf(32 * 2);
        secret.should.match(/[0-9a-z]+/);
    });
});
