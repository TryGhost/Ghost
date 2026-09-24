import assert from 'node:assert/strict';
import { assertExists } from '../../../../utils/assertions';
// @ts-expect-error This module lacks type definitions.
import Gravatar from '../../../../../core/server/lib/image/gravatar';

describe('lib/image: gravatar', function () {
  const gravatarUrl = 'https://www.gravatar.com/avatar/{hash}?s={size}&r={rating}&d={_default}';

  it('can build a gravatar url', function () {
    const gravatar = new Gravatar({
      config: {
        isPrivacyDisabled: () => false,
        get: (config: string) => {
          return config === 'gravatar'
            ? {
                url: gravatarUrl,
              }
            : null;
        },
      },
      request: () => {},
    });

    assert.equal(
      gravatar.url('exists@example.com', {
        size: 180,
        rating: 'r',
      }),
      'https://www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=180&r=r&d=blank',
    );
  });

  it('can successfully lookup a gravatar url', async function () {
    const gravatar = new Gravatar({
      config: {
        isPrivacyDisabled: () => false,
        get: (config: string) => {
          return config === 'gravatar'
            ? {
                url: gravatarUrl,
              }
            : null;
        },
      },
      request: () => {},
    });

    const result = await gravatar.lookup({ email: 'exists@example.com' });
    assertExists(result);
    assertExists(result.image);
    assert.equal(
      result.image,
      'https://www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&r=x&d=mp',
    );
  });

  it('can handle a non existant gravatar', async function () {
    const gravatar = new Gravatar({
      config: {
        isPrivacyDisabled: () => false,
        get: (config: string) => {
          return config === 'gravatar'
            ? {
                url: gravatarUrl,
              }
            : null;
        },
      },
      request: () => {
        return Promise.reject({ statusCode: 404 });
      },
    });

    const result = await gravatar.lookup({ email: 'invalid@example.com' });
    assertExists(result);
    assert.equal(result.image, undefined);
  });

  it('will timeout', function () {
    const delay = 42;
    const gravatar = new Gravatar({
      config: {
        isPrivacyDisabled: () => false,
        get: (config: string) => {
          return config === 'gravatar'
            ? {
                url: gravatarUrl,
              }
            : null;
        },
      },
      request: (_url: string, options: { timeout: { request: number } }) => {
        assert.equal(options.timeout.request, delay);
      },
    });

    gravatar.lookup({ email: 'exists@example.com' }, delay);
  });
});
