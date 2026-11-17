import assert from 'node:assert/strict';
import {
  defineDomain,
  defineEvent,
  defineJob,
  defineListener,
  definePermissions,
  defineRoutes,
  defineSchema,
  defineSettings,
  definitionKind,
} from '@tryghost/kernel/domains/definitions';

describe('domain definitions', function () {
  it('tags each definition with its kind and nothing else that can be seen', function () {
    const job = defineJob({ schedule: { once: 'boot' }, run() {} });
    assert.equal(definitionKind(job), 'job');
    assert.deepEqual(Object.keys(job).sort(), ['run', 'schedule']);

    assert.equal(
      definitionKind(defineListener({ event: 'SomethingHappened', handle() {} })),
      'listener',
    );
    assert.equal(definitionKind(defineRoutes([])), 'routes');
    assert.equal(definitionKind(defineSettings({ groups: {} })), 'settings');
    assert.equal(definitionKind(definePermissions({ objects: {} })), 'permissions');
    assert.equal(definitionKind(defineSchema({ tables: {} })), 'schema');
    assert.equal(definitionKind(defineDomain()), 'domain');
  });

  it('does not mistake other values for definitions', function () {
    for (const value of [undefined, null, 'job', 1, {}, () => {}, { kind: 'job' }]) {
      assert.equal(definitionKind(value), undefined);
    }
  });

  it('keeps fragment values as written, so a registry can merge them unchanged', function () {
    const tables = { things: { id: { type: 'string' } } };
    assert.equal(defineSchema({ tables }).tables, tables);
    assert.equal(JSON.stringify(defineSchema({ tables })), JSON.stringify({ tables }));
  });

  it('freezes fragments, so a registry that reads one cannot change it', function () {
    const settings = defineSettings({
      groups: { things: { thing_enabled: { defaultValue: 'true', type: 'boolean' } } },
      editable: ['thing_enabled'],
    });
    const setting = settings.groups.things.thing_enabled as { group?: string };
    assert.throws(() => {
      setting.group = 'things';
    }, TypeError);
    assert.throws(() => {
      (settings.editable as string[]).push('other');
    }, TypeError);
    assert.ok(Object.isFrozen(defineSchema({ tables: { things: { id: {} } } }).tables.things));
    assert.ok(Object.isFrozen(definePermissions({ objects: { thing: ['browse'] } }).objects.thing));
    assert.ok(
      Object.isFrozen(
        defineRoutes([{ surface: 'admin', method: 'get', path: '/', handler: 'a#b' }]).routes[0],
      ),
    );
  });

  it('declares an event the bus can key by name', function () {
    const ThingHappened = defineEvent<{ id: string }>('ThingHappened');
    assert.equal(definitionKind(ThingHappened), 'event');
    assert.equal(ThingHappened.name, 'ThingHappened');

    const at = new Date('2026-01-01T00:00:00Z');
    const event = ThingHappened.create({ id: 'a' }, at);
    assert.ok(event instanceof ThingHappened);
    // The event bus dispatches by constructor name.
    assert.equal(event.constructor.name, 'ThingHappened');
    assert.deepEqual(event.data, { id: 'a' });
    assert.equal(event.timestamp, at);
    // When it happened is always given: the kernel reads no clock to fill it in.
    assert.equal(new ThingHappened({ id: 'b' }, at).timestamp, at);
  });

  it('passes a calculated setting its inputs as arguments', function () {
    const settings = defineSettings({
      groups: {},
      calculated: {
        both: {
          inputs: ['first', 'second'],
          calculate: ({ first, second }) => `${String(first)}-${String(second)}`,
        },
      },
    });
    assert.equal(settings.calculated.both.calculate({ first: 'a', second: 'b' }), 'a-b');
  });
});
