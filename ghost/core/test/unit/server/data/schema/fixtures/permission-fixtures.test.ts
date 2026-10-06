import assert from 'node:assert/strict';
import { z } from 'zod';
import { withPermissionFixtures } from '../../../../../../core/server/data/schema/fixtures/permission-fixtures';
import { definitions } from '../../../../../../core/server/services/permissions/definitions';
import productionTemplate from '../../../../../../core/server/data/schema/fixtures/fixtures.json';
import testTemplate from '../../../../../utils/fixtures/fixtures.json';

const grantsSchema = z.record(z.string(), z.record(z.string(), z.unknown()));

describe('Shared permission fixture definitions', function () {
  it.each([productionTemplate, testTemplate])('populates permission seeds from the typed policy', function (template) {
    const fixtures = withPermissionFixtures(template);
    const permissions = fixtures.models.find((model) => model.name === 'Permission');
    assert.deepEqual(permissions?.entries, definitions.permissions);
    const relation = fixtures.relations.find(
      (entry) => entry.from.model === 'Role' && entry.to.model === 'Permission',
    );
    const grants = grantsSchema.parse(relation?.entries);
    for (const [role, objects] of Object.entries(definitions.grants)) {
      assert.deepEqual(grants[role] ?? {}, objects);
    }
    assert.deepEqual(fixtures.models.find((model) => model.name === 'Role'), template.models.find((model) => model.name === 'Role'));
  });

  it('leaves templates unchanged and creates independent mutable seed copies', function () {
    const before = JSON.stringify(productionTemplate);
    const first = withPermissionFixtures(productionTemplate);
    const second = withPermissionFixtures(productionTemplate);
    const entries = first.models.find((model) => model.name === 'Permission')?.entries;
    assert(entries);
    const permission = entries[0];
    assert(permission && typeof permission === 'object');
    assert(Reflect.set(permission, 'name', 'Changed seed'));
    const grants = first.relations.find((relation) => relation.from.model === 'Role' && relation.to.model === 'Permission')?.entries;
    assert(grants && typeof grants === 'object');
    assert(Reflect.set(grants, 'Contributor', {}));
    assert.deepEqual(second.models.find((model) => model.name === 'Permission')?.entries, definitions.permissions);
    assert.deepEqual(grantsSchema.parse(second.relations[0].entries).Contributor, definitions.grants.Contributor);
    assert.equal(JSON.stringify(productionTemplate), before);
    assert.notEqual(definitions.permissions[0].name, 'Changed seed');
    assert(Object.keys(definitions.grants.Contributor).length);
  });

  it('replaces configured permission data with the canonical policy', function () {
    const template = {
      models: [{ name: 'Permission', entries: [{ action_type: 'custom', object_type: 'tag' }] }],
      relations: [{ from: { model: 'Role' }, to: { model: 'Permission' }, entries: { Contributor: { tag: 'all' } } }],
    };
    const fixtures = withPermissionFixtures(template);
    assert.deepEqual(fixtures.models[0].entries, definitions.permissions);
    assert.deepEqual(grantsSchema.parse(fixtures.relations[0].entries).Contributor, definitions.grants.Contributor);
  });

  it('rejects malformed fixture templates', function () {
    assert.throws(() => withPermissionFixtures({}), z.ZodError);
  });
});
