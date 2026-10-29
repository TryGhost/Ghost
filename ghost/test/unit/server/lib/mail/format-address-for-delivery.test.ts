import assert from 'node:assert/strict';
import { formatAddressForDelivery } from '../../../../../core/server/lib/mail/format-address-for-delivery';

describe('formatAddressForDelivery', function () {
  it('removes Gmail-incompatible checkmarks and trims the display name', function () {
    assert.equal(
      formatAddressForDelivery({
        address: 'test@example.com',
        name: '  This is my awesome name ✅ ✓ ✔ ☑ 🗸  ',
      }),
      '"This is my awesome name" <test@example.com>',
    );
  });

  it('preserves quoted empty names after compatibility cleanup', function () {
    for (const name of ['✅ ✓ ✔ ☑ 🗸', '   ']) {
      assert.equal(
        formatAddressForDelivery({ address: 'test@example.com', name }),
        '"" <test@example.com>',
      );
    }
  });

  it('escapes names once without modifying the structured input', function () {
    const mailbox = Object.freeze({ address: 'Local@中文.Example', name: ' a\\b"c ✔ ' });
    assert.equal(formatAddressForDelivery(mailbox), '"a\\\\b\\"c" <Local@中文.Example>');
    assert.equal(mailbox.name, ' a\\b"c ✔ ');
  });

  it('preserves unnamed addresses', function () {
    assert.equal(formatAddressForDelivery({ address: 'test@example.com' }), 'test@example.com');
    assert.equal(
      formatAddressForDelivery({ address: 'test@example.com', name: '' }),
      'test@example.com',
    );
  });
});
