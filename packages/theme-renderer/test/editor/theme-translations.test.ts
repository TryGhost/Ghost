import assert from 'node:assert/strict';
import { it } from 'vitest';
import { createThemeSource } from '../../src/theme/theme-source.ts';

it('falls back to the original phrase for untranslated theme locale entries', () => {
  const theme = createThemeSource({
    'locales/en.json': JSON.stringify({ 'Sign in': '', 'Welcome {name}': '' }),
    'locales/fr.json': JSON.stringify({ 'Sign in': 'Connexion' }),
  });
  assert.equal(theme.i18n('en').t('Sign in'), 'Sign in');
  assert.equal(theme.i18n('en').t('Welcome {name}', { name: 'Sam' }), 'Welcome Sam');
  assert.equal(theme.i18n('fr').t('Sign in'), 'Connexion');
});
