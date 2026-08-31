import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../core/server/models';

const { EmailSpamComplaintEvent } = models;

describe('EmailSpamComplaintEvent', function () {
  describe('destroy', function () {
    it('rejects', async function () {
      let threw = false;
      try {
        await EmailSpamComplaintEvent.destroy({ id: 'blah' });
        threw = false;
      } catch (err) {
        threw = true;
      } finally {
        assert(threw);
      }
    });
  });

  describe('edit', function () {
    it('rejects', async function () {
      let threw = false;
      try {
        await EmailSpamComplaintEvent.edit({ reason: 'fuck' }, { id: 'blah' });
        threw = false;
      } catch (err) {
        threw = true;
      } finally {
        assert(threw);
      }
    });
  });
});
