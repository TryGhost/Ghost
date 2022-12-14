const should = require('should');
const errorProps = ['message', 'errorType'];
const {matchSnapshotAssertion} = require('@tryghost/jest-snapshot');

should.Assertion.add('JSONErrorObject', function () {
    this.params = {operator: 'to be a valid JSON Error Object'};
    this.obj.should.be.an.Object();
    this.obj.should.have.properties(errorProps);
});

should.Assertion.add('JSONErrorResponse', function () {
    this.params = {operator: 'to be a valid JSON Error Response'};

    this.obj.should.have.property('errors').which.is.an.Array();
    this.obj.errors.length.should.be.above(0);

    this.obj.errors.forEach(function (err) {
        err.should.be.a.JSONErrorObject();
    });
});

should.Assertion.add('matchSnapshot', matchSnapshotAssertion);
