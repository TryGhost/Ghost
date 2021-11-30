/**
* Custom Should Assertions
*
* Add any custom assertions to this file.
*/

var _ = require('lodash');
var errorProps = ['id', 'title', 'detail', 'status', 'code', 'meta'];

should.Assertion.add('JSONErrorObject', function () {
    this.params = {operator: 'to be a valid JSON Error Object'};
    this.obj.should.be.an.Object;
    this.obj.should.have.properties(errorProps);
});

should.Assertion.add('JSONErrorResponse', function (match) {
    this.params = {operator: 'to be a valid JSON Error Response'};
    
    this.obj.should.have.property('errors').which.is.an.Array;
    this.obj.errors.length.should.be.above(0);
    
    this.obj.errors.forEach(function (err) {
        err.should.be.a.JSONErrorObject();
    });
    
    if (match) {
        _.some(this.obj.errors, match).should.be.true();
    }
});