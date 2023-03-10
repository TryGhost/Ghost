const should = require('should');
const {matchSnapshotAssertion} = require('@tryghost/express-test').snapshot;

should.Assertion.add('matchSnapshot', matchSnapshotAssertion);
