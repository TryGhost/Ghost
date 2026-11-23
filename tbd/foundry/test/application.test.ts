import assert from 'node:assert/strict';
import type { Foundation } from '@tryghost/kernel/foundation';
import { describe, it } from 'vitest';
import { createApplication } from '../src/application.ts';

describe('createApplication', function () {
  it('holds the foundation it is given and services of its own, reading nothing', function () {
    // Any read of the foundation would throw.
    const foundation = new Proxy(
      {},
      {
        get(_, property) {
          throw new Error(`Read ${String(property)} while the application was being built`);
        },
      },
    ) as Foundation;

    const application = createApplication({ name: 'Example', foundation });
    const other = createApplication({ name: 'Other', foundation });

    assert.equal(application.name, 'Example');
    assert.equal(application.foundation, foundation);
    assert.equal(application.services.isOpen, false);
    assert.notEqual(application.services, other.services);
  });
});
