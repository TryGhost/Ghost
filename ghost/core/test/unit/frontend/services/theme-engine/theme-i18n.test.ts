import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import { ThemeI18n } from '../../../../../core/frontend/services/theme-engine/i18n';

describe('ThemeI18n Class behavior', function () {
  it('defaults to en', function () {
    const i18n = new ThemeI18n();
    assert.equal(i18n.locale(), 'en');
  });
});
