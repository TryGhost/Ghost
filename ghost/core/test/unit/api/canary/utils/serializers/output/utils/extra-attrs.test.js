const assert = require('assert/strict');
const sinon = require('sinon');
const extraAttrsUtil = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/extra-attrs');

describe('Unit: endpoints/utils/serializers/output/utils/extra-attrs', function () {
    const options = {
        columns: ['excerpt', 'custom_excerpt', 'plaintext']
    };

    let model;

    beforeEach(function () {
        model = sinon.stub();
        model.get = sinon.stub();
        model.get.withArgs('plaintext').returns(new Array(5000).join('A'));
    });

    describe('for post', function () {
        it('respects custom excerpt', function () {
            const attrs = {custom_excerpt: 'custom excerpt'};
            extraAttrsUtil.forPost(options, model, attrs);
            assert.equal(attrs.excerpt, attrs.custom_excerpt);
        });

        it('no custom excerpt', function () {
            const attrs = {};

            extraAttrsUtil.forPost(options, model, attrs);
            assert.ok(model.get.called);
            assert.equal(attrs.excerpt, new Array(501).join('A'));
        });

        it('has excerpt when plaintext is null', function () {
            model.get.withArgs('plaintext').returns(null);
            const attrs = {};
            extraAttrsUtil.forPost(options, model, attrs);
            assert.ok(model.get.called);
            assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'excerpt'), true);
            assert.equal(attrs.excerpt, null);
        });

        it('has plaintext when columns includes plaintext', function () {
            const attrs = {};
            extraAttrsUtil.forPost({
                columns: ['plaintext']
            }, model, attrs);
            assert.ok(model.get.called);
            assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'plaintext'), true);
        });

        it('has plaintext when formats includes plaintext', function () {
            const attrs = {};
            extraAttrsUtil.forPost({
                formats: ['plaintext']
            }, model, attrs);
            assert.ok(model.get.called);
            assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'plaintext'), true);
        });

        it('has excerpt when no columns are passed', function () {
            const attrs = {};
            extraAttrsUtil.forPost({}, model, attrs);
            assert.ok(model.get.called);
            assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'excerpt'), true);
        });

        it('has reading_time when no columns are passed', function () {
            const attrs = {
                html: 'html'
            };
            extraAttrsUtil.forPost({}, model, attrs);
            assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'reading_time'), true);
        });

        it('has reading_time when columns includes reading_time', function () {
            const attrs = {
                html: 'html'
            };
            extraAttrsUtil.forPost({
                columns: ['reading_time']
            }, model, attrs);
            assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'reading_time'), true);
        });
    });
});
