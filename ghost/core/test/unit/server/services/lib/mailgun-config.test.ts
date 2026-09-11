import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import {
  getMailgunConfig,
  getMailgunDomains,
} from '../../../../../core/server/services/lib/mailgun-config';

const read = (values: Record<string, unknown>) => ({ get: (key: string) => values[key] });
const mailgun = {
  apiKey: 'key',
  baseUrl: 'https://api.mailgun.net/v3',
  domain: 'primary.example.com',
};
const settings = read({
  mailgun_api_key: 'settings-key',
  mailgun_domain: 'settings.example.com',
  mailgun_base_url: 'https://api.eu.mailgun.net/v3',
});

describe('Mailgun config', () => {
  afterEach(() => sinon.restore());

  it('prefers a complete config block over settings', () => {
    assert.deepEqual(getMailgunConfig(read({ bulkEmail: { mailgun } }), settings), mailgun);
  });

  it('disables Mailgun with a warning for an invalid config block instead of using settings', () => {
    const warn = sinon.stub(logging, 'warn');
    const config = read({ bulkEmail: { mailgun: { ...mailgun, baseUrl: '' } } });
    assert.equal(getMailgunConfig(config, settings), null);
    sinon.assert.calledWithMatch(warn, /invalid bulkEmail.mailgun config/);
  });

  it('uses settings only when all three values exist', () => {
    assert.deepEqual(getMailgunConfig(read({}), settings), {
      apiKey: 'settings-key',
      domain: 'settings.example.com',
      baseUrl: 'https://api.eu.mailgun.net/v3',
    });
    assert.equal(
      getMailgunConfig(read({ bulkEmail: {} }), read({ mailgun_api_key: 'settings-key' })),
      null,
    );
    assert.equal(getMailgunConfig(read({}), read({})), null);
  });

  it('treats unexpected setting and config types as absent', () => {
    assert.equal(
      getMailgunConfig(
        read({}),
        read({ mailgun_api_key: 42, mailgun_domain: 'd', mailgun_base_url: 'u' }),
      ),
      null,
    );
    assert.deepEqual(
      getMailgunDomains(
        read({ 'hostSettings:managedEmail:fallbackDomain': 42 }),
        'primary.example.com',
      ),
      ['primary.example.com'],
    );
  });

  it('adds a distinct fallback sending domain', () => {
    assert.deepEqual(getMailgunDomains(read({}), 'primary.example.com'), ['primary.example.com']);
    assert.deepEqual(
      getMailgunDomains(
        read({ 'hostSettings:managedEmail:fallbackDomain': 'primary.example.com' }),
        'primary.example.com',
      ),
      ['primary.example.com'],
    );
    assert.deepEqual(
      getMailgunDomains(
        read({ 'hostSettings:managedEmail:fallbackDomain': 'fallback.example.com' }),
        'primary.example.com',
      ),
      ['primary.example.com', 'fallback.example.com'],
    );
  });
});
