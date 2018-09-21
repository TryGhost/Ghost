// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const prettyCLI = require('../pretty-cli');

// Check the API is as we depend on in other modules;
describe('API', function () {
    it('Exposes styled-sywac, styles & the sywac API', function () {
        // Detect a basic prestyled sywac instance
        prettyCLI.should.be.an.Object().with.property('types');
        prettyCLI.parseAndExit.should.be.a.Function();

        // Detect the basic sywac Api
        prettyCLI.Api.should.be.a.Function();
        prettyCLI.Api.get.should.be.a.Function();

        // Detect style rules
        prettyCLI.styles.should.be.an.Object();
        prettyCLI.styles.should.have.properties([
            'usagePrefix',
            'group',
            'flags',
            'hints',
            'groupError',
            'flagsError',
            'descError',
            'hintsError',
            'messages'
        ]);
    });
});
