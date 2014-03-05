/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    DataGenerator    = require('../../utils/fixtures/data-generator'),
    NotificationsAPI = require('../../../server/api/notifications');

describe('Notifications API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                done();
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('can browse', function (done) {
        var msg = {
            type: 'error', // this can be 'error', 'success', 'warn' and 'info'
            message: 'This is an error', // A string. Should fit in one line.
            status: 'persistent', // or 'passive'
            id: 'auniqueid' // A unique ID
        };
        NotificationsAPI.add(msg).then(function (notification){
            NotificationsAPI.browse().then(function (results) {
                should.exist(results);
                results.length.should.be.above(0);
                testUtils.API.checkResponse(results[0], 'notification');
                done();
            });
        });
    });
});