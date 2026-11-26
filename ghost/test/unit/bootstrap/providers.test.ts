import assert from 'node:assert/strict';
import providers from '../../../bootstrap/providers';

// A provider names its files and loads none, so a wrong path or a missing default
// export would only show when the first event arrived or the job first ran. This loads every one.
describe('Every provider', function () {
  it('has a name no other provider has', function () {
    const names = providers.map((provider) => provider.name);
    assert.deepEqual(names, [...new Set(names)]);
  });

  for (const provider of providers) {
    for (const [index, { event, load }] of provider.listeners.entries()) {
      const name = typeof event === 'string' ? event : event.name;
      it(`${provider.name} lists a listener for ${name} that loads (listener ${index + 1})`, function () {
        assert.equal(typeof load().default, 'function');
      });
    }

    for (const job of provider.jobs) {
      it(`${provider.name} lists a job named ${job.name} that loads`, function () {
        assert.equal(typeof job.load().default, 'function');
      });

      it(`${provider.name} gives ${job.name} a schedule the jobs service accepts, or none`, function () {
        if (job.cron !== undefined) {
          assert.match(job.cron, /^\d{1,2} \d{1,2} \d{1,2} \* \* \*$/);
        }
      });
    }
  }
});
