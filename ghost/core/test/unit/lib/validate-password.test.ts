// secretlint-disable
import { range } from 'lodash';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { validatePassword } from '../../../core/server/lib/validate-password';
// @ts-expect-error This module lacks type definitions.
import settingsCache from '../../../core/shared/settings-cache';
import urlUtils from '../../../core/shared/url-utils';

const VALID_PASSWORD = 'hHa5BCKOEIwPpTcB';

const assertValidPassword = (
  password: string,
  email = 'user@example.com',
  siteTitle?: string,
): void => {
  assert.deepEqual(validatePassword(password, email, siteTitle), { isValid: true });
};

const assertTooShortPassword = (password: string): void => {
  assert.deepEqual(validatePassword(password, 'user@example.com'), {
    isValid: false,
    message: 'Your password must be at least 10 characters long.',
  });
};

const assertInsecurePassword = (
  password: string,
  email = 'user@example.com',
  siteTitle?: string,
): void => {
  assert.deepEqual(validatePassword(password, email, siteTitle), {
    isValid: false,
    message: 'Sorry, you cannot use an insecure password.',
  });
};

describe('password validation', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('disallows short passwords', function () {
    for (let length = 0; length < 10; length++) {
      const password = VALID_PASSWORD.slice(0, length);
      assertTooShortPassword(password);
    }
    assertTooShortPassword('åß∂ƒ©˙∆˚¬');
    assertTooShortPassword('😀😃😄😁😆😅😂🤣☺️');
  });

  it('disallows long passwords', function () {
    const password = 'x'.repeat(257);
    assert.deepEqual(validatePassword(password, 'user@example.com'), {
      isValid: false,
      message: 'Your password is too long.',
    });
  });

  it('disallows specific known insecure passwords', function () {
    const passwords = [
      '0987654321',
      '1234567890',
      '12345asdfg',
      '1q2w3e4r5t',
      'abcdefghij',
      'asdfghjkl;',
      'qwertyuiop',
      'qwertzuiop',
    ];
    for (const password of passwords) {
      assertInsecurePassword(password);
    }
  });

  it("disallows passwords that match the user's email address", function () {
    assertInsecurePassword('user@example.com', 'user@example.com');
    assertInsecurePassword('USER@example.com', 'user@example.com');
    assertInsecurePassword('user@example.com', 'USER@example.com');
  });

  it('disallows specific substrings', function () {
    const substrings = ['password', 'passw0rd', 'ghost'];
    for (const substring of substrings) {
      assertInsecurePassword(substring.padEnd(10, 'x'));
      assertInsecurePassword(`abc${substring}def`);
      assertInsecurePassword(`abc${substring.toUpperCase()}def`);
    }
  });

  it('disallows matches with the site title', function () {
    const siteTitle = 'MyVeryCoolSite';
    const settingsGet = sinon.stub(settingsCache, 'get');

    const passwords = ['MyVeryCoolSite', 'myverycoolsite', 'MYVERYCOOLSITE'];
    for (const password of passwords) {
      assertInsecurePassword(password, 'user@example.com', siteTitle);
    }

    sinon.assert.notCalled(settingsGet);
  });

  it('uses the site title from settings when none is provided', function () {
    const siteTitle = 'MyVeryCoolSite';
    sinon.stub(settingsCache, 'get').withArgs('title').returns(siteTitle);

    for (const password of [siteTitle, siteTitle.toLowerCase(), siteTitle.toUpperCase()]) {
      assertInsecurePassword(password);
    }
  });

  it('disallows matches with the site URL', function () {
    sinon
      .stub(urlUtils, 'urlFor')
      .withArgs('home', true)
      .returns('https://MyVeryCoolSite.example/');

    assertInsecurePassword('MyVeryCoolSite.example');
    assertInsecurePassword('myverycoolsite.example/');
    assertInsecurePassword('MYVERYCOOLSITE.EXAMPLE');
  });

  it('disallows matches with an HTTP site URL', function () {
    sinon
      .stub(urlUtils, 'urlFor')
      .withArgs('home', true)
      .returns('http://MyVeryCoolSite.example/foo/');

    assertInsecurePassword('myverycoolsite.example/foo');
    assertInsecurePassword('MYVERYCOOLSITE.EXAMPLE/FOO/');
  });

  it('allows passwords that only contain the site URL', function () {
    sinon
      .stub(urlUtils, 'urlFor')
      .withArgs('home', true)
      .returns('https://MyVeryCoolSite.example/');

    assertValidPassword('prefix-MyVeryCoolSite.example-suffix');
  });

  it('disallows passwords where 50% or more of the characters are the same', function () {
    const passwords = ['xxxxxxabcdef', 'xxxxxabcde', '1a1b1c1d1e', 'xxxxxxabcde'];
    for (const password of passwords) {
      assertInsecurePassword(password);
    }
  });

  it('allows normal valid passwords', function () {
    assertValidPassword(VALID_PASSWORD);
    assertValidPassword(VALID_PASSWORD, '');
  });

  it('allows passwords at exactly the minimum length', function () {
    assertValidPassword('A1b2C3d4E5');
    assertValidPassword('åß∂ƒ©˙∆˚¬…');
    assertValidPassword('😀😃😄😁😆😅😂🤣☺️😊');
  });

  it('allows passwords at exactly the maximum length', function () {
    const codePoints = range(33, 289);
    const password = String.fromCodePoint(...codePoints);
    assertValidPassword(password);
  });

  it("allows passwords that contain the user's email address but are not equal", function () {
    assertValidPassword('prefix-user@example.com-suffix', 'user@example.com');
  });

  it('allows passwords that contain the site title but are not equal', function () {
    assertValidPassword('prefix-MyVeryCoolSite-suffix', 'user@example.com', 'MyVeryCoolSite');
  });

  it('allows passwords with an empty email address', function () {
    assertValidPassword(VALID_PASSWORD, '');
  });

  it('allows passwords where fewer than 50% of the characters are the same', function () {
    const passwords = ['xxxxabcdef', 'xxxxxabcdef', '1a1b1c1d2e', 'AAAAaaaa12'];
    for (const password of passwords) {
      assertValidPassword(password);
    }
  });
});
