import assert from 'node:assert/strict';
import providers from '../../../bootstrap/providers';

// A provider names its files and loads none, so a wrong path or a missing default
// export would only show when the first event arrived. This loads every one.
describe('Every provider', function () {
  it('has a name no other provider has', function () {
    const names = providers.map((provider) => provider.name);
    assert.deepEqual(names, [...new Set(names)]);
  });

  for (const provider of providers) {
    for (const [event, loads] of Object.entries(provider.listeners)) {
      for (const [index, load] of loads.entries()) {
        it(`${provider.name} lists a listener for ${event} that loads (${index + 1} of ${loads.length})`, function () {
          assert.equal(typeof load().default, 'function');
        });
      }
    }
  }
});
