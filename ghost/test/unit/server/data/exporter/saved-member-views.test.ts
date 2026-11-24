import assert from 'node:assert/strict';
import { withSegmentsAsSavedViews } from '../../../../../core/server/data/exporter/saved-member-views';

// The site export's API tests cover an export with segments. These are the settings an export
// leaves as they are.

const segment = (name: string, filter: string, position: number) => ({
  id: name,
  name,
  filter,
  sort_order: position,
});

const savedViews = (value: string | null) => ({ key: 'shared_views', group: 'site', value });

describe('Segments as saved member views in an export', function () {
  it('adds no view for a segment the setting already holds', function () {
    const value = JSON.stringify([
      { name: 'VIP', route: 'members', filter: { filter: 'label:vip' } },
    ]);

    const settings = withSegmentsAsSavedViews(
      [savedViews(value), { key: 'title', value: 'Site' }],
      [segment('VIP', 'label:vip', 0)],
    );

    assert.deepEqual(settings, [savedViews(value), { key: 'title', value: 'Site' }]);
  });

  it('adds a segment that has the filter of a view the setting holds under another name', function () {
    const held = { name: 'VIP', route: 'members', filter: { filter: 'label:vip' } };

    const settings = withSegmentsAsSavedViews(
      [savedViews(JSON.stringify([held]))],
      [segment('VIP', 'label:vip', 0), segment('Gold', 'label:vip', 1)],
    );

    assert.deepEqual(settings, [
      savedViews(
        JSON.stringify([held, { name: 'Gold', route: 'members', filter: { filter: 'label:vip' } }]),
      ),
    ]);
  });

  it('leaves a value that cannot be read as views', function () {
    const settings = withSegmentsAsSavedViews(
      [savedViews('"not a list"')],
      [segment('VIP', 'label:vip', 0)],
    );

    assert.deepEqual(settings, [savedViews('"not a list"')]);
  });

  it('leaves a value that would be longer than an older version stores', function () {
    const settings = withSegmentsAsSavedViews(
      [savedViews('[]')],
      [segment('Long', `label:${'a'.repeat(70000)}`, 0)],
    );

    assert.deepEqual(settings, [savedViews('[]')]);
  });
});
