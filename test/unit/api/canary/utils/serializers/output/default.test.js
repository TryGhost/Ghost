const should = require('should');
const sinon = require('sinon');
const serializers = require('../../../../../../../core/server/api/canary/utils/serializers');
const mappers = require('../../../../../../../core/server/api/canary/utils/serializers/output/mappers');

describe('Unit: canary/utils/serializers/output/default', function () {
    let toJSONStub;
    beforeEach(function () {
        toJSONStub = sinon.stub().callsFake(function () {
            return {title: this.title, hello: 'world'};
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('.all() can map a pojo with one object', function () {
        const response = {
            title: 'foo'
        };

        const apiConfig = {
            docName: 'stuffs'
        };
        const frame = {};

        serializers.output.default.all(response, apiConfig, frame);

        frame.response.should.eql({
            stuffs: [response]
        });
    });

    it('.all() can map a pojo of many objects', function () {
        const response = {
            data: [
                {
                    title: 'foo'
                },
                {
                    title: 'bar'
                }
            ],
            meta: {
                total: 2
            }
        };

        const apiConfig = {
            docName: 'stuffs'
        };
        const frame = {};

        serializers.output.default.all(response, apiConfig, frame);

        frame.response.should.eql({
            stuffs: response.data,
            meta: response.meta
        });
    });

    it('.all() can map a single Bookshelf model', function () {
        const response = {
            toJSON: toJSONStub,
            title: 'foo'
        };

        const apiConfig = {
            docName: 'stuffs'
        };
        const frame = {};

        serializers.output.default.all(response, apiConfig, frame);

        frame.response.should.eql({
            stuffs: [
                {title: 'foo', hello: 'world'}
            ]
        });

        sinon.assert.calledOnce(toJSONStub);
    });

    it('.all() can map a Bookshelf collection', function () {
        const response = {
            data: [
                {
                    toJSON: toJSONStub,
                    title: 'foo'
                },
                {
                    toJSON: toJSONStub,
                    title: 'bar'
                }
            ],
            meta: {
                total: 2
            }
        };

        const apiConfig = {
            docName: 'stuffs'
        };
        const frame = {};

        serializers.output.default.all(response, apiConfig, frame);

        frame.response.should.eql({
            stuffs: [
                {title: 'foo', hello: 'world'},
                {title: 'bar', hello: 'world'}
            ],
            meta: response.meta
        });

        sinon.assert.calledTwice(toJSONStub);
    });

    it('.all() can map a single Bookshelf model with custom mapper', function () {
        mappers.stuffs = sinon.stub().callsFake(function (res) {
            return {
                title: res.title,
                custom: 'thing'
            };
        });

        const response = {
            toJSON: toJSONStub,
            title: 'foo'
        };

        const apiConfig = {
            docName: 'stuffs'
        };
        const frame = {};

        serializers.output.default.all(response, apiConfig, frame);

        frame.response.should.eql({
            stuffs: [
                {title: 'foo', custom: 'thing'}
            ]
        });

        sinon.assert.calledOnce(mappers.stuffs);
        sinon.assert.notCalled(toJSONStub);
    });

    it('.all() can map a Bookshelf collection with custom mapper', function () {
        mappers.stuffs = sinon.stub().callsFake(function (res) {
            return {
                title: res.title,
                custom: 'thing'
            };
        });

        const response = {
            data: [
                {
                    toJSON: toJSONStub,
                    title: 'foo'
                },
                {
                    toJSON: toJSONStub,
                    title: 'bar'
                }
            ],
            meta: {
                total: 2
            }
        };

        const apiConfig = {
            docName: 'stuffs'
        };
        const frame = {};

        serializers.output.default.all(response, apiConfig, frame);

        frame.response.should.eql({
            stuffs: [
                {title: 'foo', custom: 'thing'},
                {title: 'bar', custom: 'thing'}
            ],
            meta: response.meta
        });

        sinon.assert.calledTwice(mappers.stuffs);
        sinon.assert.notCalled(toJSONStub);
    });
});
