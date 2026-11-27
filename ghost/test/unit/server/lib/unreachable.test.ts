import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import { unreachable } from '../../../../core/server/lib/unreachable';

describe('Unit: lib/unreachable', function () {
  it('throws a server error that shows the unhandled value', function () {
    assert.throws(
      // @ts-expect-error A value the type rules out, as a JavaScript caller or bad data passes it.
      () => unreachable({ fields: 'some' }, 'grant'),
      (error) =>
        error instanceof errors.InternalServerError &&
        error.message === 'Unhandled grant: {"fields":"some"}',
    );
  });
});
