const MockExpressAgent = require('./mock-express-agent');
const setup = require('./setup');

module.exports = setup;
module.exports.mockExpress = require('./mock-express');
module.exports.getAgent = async (app, host) => {
    app = await setup.initGhost();
    return new MockExpressAgent({app, host});
};
