const chai = require('chai');
const chaiJestSnapshot = require('@ethanresnick/chai-jest-snapshot');

chai.use(chaiJestSnapshot);

exports.mochaHooks = {
    beforeAll() {
        chaiJestSnapshot.resetSnapshotRegistry();
    },

    beforeEach() {
        chaiJestSnapshot.configureUsingMochaContext(this);
    }
};
