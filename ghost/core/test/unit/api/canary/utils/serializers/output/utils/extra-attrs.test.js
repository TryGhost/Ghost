const assert = require('node:assert/strict');
const sinon = require('sinon');
const labs = require('../../../../../../../../core/shared/labs');
const extraAttrsUtil = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/extra-attrs');

describe('Unit: endpoints/utils/serializers/output/utils/extra-attrs', function () {
  const options = {
    columns: ['excerpt', 'custom_excerpt', 'plaintext'],
  };

  let model;
  let modelGetStub;
  let labsStub;

  beforeEach(function () {
    model = sinon.stub();
    modelGetStub = sinon.stub(model, 'get');
    modelGetStub.withArgs('plaintext').returns(new Array(5000).join('A'));
    labsStub = sinon.stub(labs, 'isSet').returns(false);
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('for post', function () {
    it('respects custom excerpt', function () {
      const attrs = { custom_excerpt: 'custom excerpt' };
      extraAttrsUtil.forPost(options, model, attrs);
      assert.equal(attrs.excerpt, attrs.custom_excerpt);
    });

    it('no custom excerpt', function () {
      const attrs = {};

      extraAttrsUtil.forPost(options, model, attrs);
      sinon.assert.called(modelGetStub);
      assert.equal(attrs.excerpt, new Array(501).join('A'));
    });

    it('has excerpt when plaintext is null', function () {
      modelGetStub.withArgs('plaintext').returns(null);
      const attrs = {};
      extraAttrsUtil.forPost(options, model, attrs);
      sinon.assert.called(modelGetStub);
      assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'excerpt'), true);
      assert.equal(attrs.excerpt, null);
    });

    it('has plaintext when columns includes plaintext', function () {
      const attrs = {};
      extraAttrsUtil.forPost(
        {
          columns: ['plaintext'],
        },
        model,
        attrs,
      );
      sinon.assert.called(modelGetStub);
      assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'plaintext'), true);
    });

    it('has plaintext when formats includes plaintext', function () {
      const attrs = {};
      extraAttrsUtil.forPost(
        {
          formats: ['plaintext'],
        },
        model,
        attrs,
      );
      sinon.assert.called(modelGetStub);
      assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'plaintext'), true);
    });

    it('has excerpt when no columns are passed', function () {
      modelGetStub.withArgs('custom_excerpt').returns(null);
      const attrs = {};
      extraAttrsUtil.forPost({}, model, attrs);
      sinon.assert.called(modelGetStub);
      assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'excerpt'), true);
    });

    it('has reading_time when no columns are passed', function () {
      const attrs = {
        html: 'html',
      };
      extraAttrsUtil.forPost({}, model, attrs);
      assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'reading_time'), true);
    });

    it('has reading_time when columns includes reading_time', function () {
      const attrs = {
        html: 'html',
      };
      extraAttrsUtil.forPost(
        {
          columns: ['reading_time'],
        },
        model,
        attrs,
      );
      assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'reading_time'), true);
    });

    it('does not leak null reading_time from the database when html is absent', function () {
      const attrs = {
        reading_time: null,
      };
      extraAttrsUtil.forPost({}, model, attrs);
      assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'reading_time'), false);
    });

    describe('storedPostMetadata labs flag', function () {
      beforeEach(function () {
        labsStub.withArgs('storedPostMetadata').returns(true);
      });

      it('prefers stored auto_excerpt over plaintext when columns include excerpt', function () {
        modelGetStub.withArgs('auto_excerpt').returns('stored excerpt');
        modelGetStub.withArgs('plaintext').returns('plaintext that should be ignored');
        const attrs = {};

        extraAttrsUtil.forPost(
          {
            columns: ['excerpt'],
          },
          model,
          attrs,
        );

        assert.equal(attrs.excerpt, 'stored excerpt');
        sinon.assert.neverCalledWith(modelGetStub, 'plaintext');
      });

      it('still lets custom_excerpt win over stored auto_excerpt', function () {
        modelGetStub.withArgs('auto_excerpt').returns('stored excerpt');
        const attrs = { custom_excerpt: 'custom excerpt' };

        extraAttrsUtil.forPost(options, model, attrs);

        assert.equal(attrs.excerpt, 'custom excerpt');
      });

      it('returns null excerpt when stored auto_excerpt is missing (no plaintext fallback)', function () {
        modelGetStub.withArgs('auto_excerpt').returns(null);
        modelGetStub.withArgs('custom_excerpt').returns(null);
        modelGetStub.withArgs('plaintext').returns(new Array(5000).join('A'));
        const attrs = {};

        extraAttrsUtil.forPost({}, model, attrs);

        assert.equal(attrs.excerpt, null);
      });

      it('prefers stored reading_time even when html is absent', function () {
        const attrs = {
          reading_time: 7,
        };

        extraAttrsUtil.forPost({}, model, attrs);

        assert.equal(attrs.reading_time, 7);
      });

      it('keeps stored reading_time of 0', function () {
        const attrs = {
          reading_time: 0,
          html: '<p>short</p>',
        };

        extraAttrsUtil.forPost({}, model, attrs);

        assert.equal(attrs.reading_time, 0);
      });

      it('falls back to computing reading_time when stored value is null', function () {
        const attrs = {
          reading_time: null,
          html: '<p>html</p>',
        };

        extraAttrsUtil.forPost({}, model, attrs);

        assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'reading_time'), true);
        assert.equal(typeof attrs.reading_time, 'number');
      });

      it('does not expose reading_time when stored is null and html is absent', function () {
        const attrs = {
          reading_time: null,
        };

        extraAttrsUtil.forPost({}, model, attrs);

        assert.equal(Object.prototype.hasOwnProperty.call(attrs, 'reading_time'), false);
      });
    });
  });
});
