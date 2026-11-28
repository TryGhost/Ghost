import assert from 'node:assert/strict';
import {
  appNotAllowed,
  appScopeRequired,
} from '../../../../../core/server/auth/policy/app-refusals';

describe('The refusals of an app', function () {
  it('gives each of the two its own code, as a 403', function () {
    assert.deepEqual(
      [appNotAllowed(), appScopeRequired('post:browse')].map(
        ({ statusCode, errorType, code, message }) => ({ statusCode, errorType, code, message }),
      ),
      [
        {
          statusCode: 403,
          errorType: 'NoPermissionError',
          code: 'APP_NOT_ALLOWED',
          message: 'Apps are not allowed to access this endpoint',
        },
        {
          statusCode: 403,
          errorType: 'NoPermissionError',
          code: 'APP_SCOPE_REQUIRED',
          message: 'This app was not approved for the post:browse scope',
        },
      ],
    );
  });
});
