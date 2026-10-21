import assert from 'node:assert/strict';
import { buildInvalidAutomationPayloadMessage } from '../../../../../../core/server/services/automations/util/build-invalid-automation-payload-message';

describe('buildInvalidAutomationPayloadMessage', function () {
  const message = 'Invalid automation edit payload.';

  it('returns the original message when there are no issues', function () {
    assert.equal(buildInvalidAutomationPayloadMessage([], message), message);
  });

  it('formats field paths, including nested array items', function () {
    assert.equal(
      buildInvalidAutomationPayloadMessage(
        [
          { code: 'custom', path: ['name'], message: 'Required' },
          { code: 'custom', path: ['actions', 0, 'data', 'wait_hours'], message: 'Too large' },
        ],
        message,
      ),
      'Invalid automation edit payload. name: Required; actions.0.data.wait_hours: Too large.',
    );
  });

  it('labels issues without a path as payload', function () {
    assert.equal(
      buildInvalidAutomationPayloadMessage(
        [{ code: 'custom', path: [], message: 'Expected an object' }],
        message,
      ),
      'Invalid automation edit payload. payload: Expected an object.',
    );
  });

  it('includes only the first three issues', function () {
    assert.equal(
      buildInvalidAutomationPayloadMessage(
        [
          { code: 'custom', path: ['name'], message: 'Required' },
          { code: 'custom', path: ['status'], message: 'Invalid' },
          { code: 'custom', path: ['actions'], message: 'Required' },
          { code: 'custom', path: ['edges'], message: 'Required' },
        ],
        message,
      ),
      'Invalid automation edit payload. name: Required; status: Invalid; actions: Required.',
    );
  });
});
