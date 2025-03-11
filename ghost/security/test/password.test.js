require('should');
const security = require('../');

describe('Lib: Security - Password', function () {
    it('hash plain password', function () {
        return security.password.hash('test')
            .then(function (hash) {
                hash.should.match(/^\$2[ayb]\$.{56}$/);
            });
    });

    it('compare password', function () {
        return security.password.compare('test', '$2a$10$we16f8rpbrFZ34xWj0/ZC.LTPUux8ler7bcdTs5qIleN6srRHhilG')
            .then(function (valid) {
                valid.should.be.true;
            });
    });
});
