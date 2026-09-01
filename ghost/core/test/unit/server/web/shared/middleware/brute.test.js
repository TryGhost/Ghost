const assert = require('node:assert/strict');
const sinon = require('sinon');
const brute = require('../../../../../../core/server/web/shared/middleware/brute');

describe('brute middleware', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('exports a contentApiKey method', function () {
    assert.equal(typeof brute.contentApiKey, 'function');
  });

  it('exports checkout session methods', function () {
    assert.equal(typeof brute.checkoutSessionGlobal, 'function');
    assert.equal(typeof brute.checkoutSessionEmail, 'function');
  });

  describe('contentApiKey', function () {
    it('calls the contentApiKey method of spam prevention', function () {
      const spamPrevention = require('../../../../../../core/server/web/shared/middleware/api/spam-prevention');
      const contentApiKeyStub = sinon.stub(spamPrevention, 'contentApiKey');

      // CASE: we don't care about what params it takes
      // just whether it calls the spam prevention stuff
      try {
        brute.contentApiKey();
      } catch (err) {
        // I don't care
      } finally {
        sinon.assert.called(contentApiKeyStub);
      }
    });
  });

  describe('memberPasskeyAuth', function () {
    it('resets the enumeration limiter after a successful response', function () {
      const spamPrevention = require('../../../../../../core/server/web/shared/middleware/api/spam-prevention');
      const reset = sinon.spy();
      const on = sinon.stub().callsFake((event, callback) => {
        assert.equal(event, 'finish');
        callback();
      });
      const prevent = sinon.stub().callsFake((req, res, next) => {
        req.brute = { reset };
        next();
      });
      sinon.stub(spamPrevention, 'membersAuthEnumeration').returns({ prevent });

      const next = sinon.spy();
      brute.memberPasskeyAuth({}, { on, statusCode: 200 }, next);

      sinon.assert.calledOnce(prevent);
      sinon.assert.calledOnce(reset);
      sinon.assert.calledOnce(next);
    });

    it('keeps failed passkey attempts in the enumeration limiter', function () {
      const spamPrevention = require('../../../../../../core/server/web/shared/middleware/api/spam-prevention');
      const reset = sinon.spy();
      const on = sinon.stub().callsFake((event, callback) => {
        assert.equal(event, 'finish');
        callback();
      });
      const prevent = sinon.stub().callsFake((req, res, next) => {
        req.brute = { reset };
        next();
      });
      sinon.stub(spamPrevention, 'membersAuthEnumeration').returns({ prevent });

      brute.memberPasskeyAuth({}, { on, statusCode: 401 }, sinon.spy());

      sinon.assert.notCalled(reset);
    });
  });

  describe('checkoutSessionGlobal', function () {
    it('calls the checkoutSessionGlobal method of spam prevention', function () {
      const spamPrevention = require('../../../../../../core/server/web/shared/middleware/api/spam-prevention');
      const checkoutSessionGlobalStub = sinon.stub(spamPrevention, 'checkoutSessionGlobal');

      try {
        brute.checkoutSessionGlobal();
      } catch (err) {
        // We only care that the spam prevention method is called.
      } finally {
        sinon.assert.called(checkoutSessionGlobalStub);
      }
    });
  });

  describe('checkoutSessionEmail', function () {
    it('calls the checkoutSessionEmail method of spam prevention', function () {
      const spamPrevention = require('../../../../../../core/server/web/shared/middleware/api/spam-prevention');
      const checkoutSessionEmailStub = sinon.stub(spamPrevention, 'checkoutSessionEmail');

      try {
        brute.checkoutSessionEmail({ body: { customerEmail: 'test@example.com' } });
      } catch (err) {
        // We only care that the spam prevention method is called.
      } finally {
        sinon.assert.called(checkoutSessionEmailStub);
      }
    });
  });
});
