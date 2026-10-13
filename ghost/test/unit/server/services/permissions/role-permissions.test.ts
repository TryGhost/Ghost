import assert from 'node:assert/strict';
import * as rolePermissions from '../../../../../core/server/services/permissions/role-permissions';
import {
  permissions as permissionData,
  rolePermissions as roleData,
} from '../../../../../core/server/services/permissions/permissions-data';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../../core/server/models';
// @ts-expect-error This module lacks type definitions.
import FixtureManager from '../../../../../core/server/data/schema/fixtures/fixture-manager';

type Permission = { action_type: string; object_type: string };
type RoleValues = Record<string, 'all' | readonly string[]>;

const roleValues = roleData as Record<string, RoleValues>;

const toKeys = (permissions: Permission[]) =>
  permissions.map((perm) => `${perm.action_type}:${perm.object_type}`).sort();

const actionsFor = (permissions: Permission[], objectType: string) =>
  permissions
    .filter((perm) => perm.object_type === objectType)
    .map((perm) => perm.action_type)
    .sort();

describe('Permissions', function () {
  describe('rolePermissions', function () {
    describe('all', function () {
      it('returns every permission in the data file as plain objects', function () {
        const expected = Object.entries(permissionData).flatMap(([object_type, actions]) =>
          actions.map((action_type) => ({ action_type, object_type })),
        );

        assert.deepEqual(rolePermissions.all(), expected);
      });

      it('returns a fresh array each time', function () {
        const first = rolePermissions.all();
        const length = first.length;
        first.pop();

        assert.equal(rolePermissions.all().length, length);
      });
    });

    describe('roleNames', function () {
      it('returns every role in the data file, which excludes Owner', function () {
        const names = rolePermissions.roleNames();

        assert.deepEqual([...names].sort(), Object.keys(roleData).sort());
        assert(!names.includes('Owner'));
        assert(names.includes('Administrator'));
      });
    });

    describe('forRoles', function () {
      it('expands "all" to every action for the object type', function () {
        assert.equal(roleValues.Administrator.db, 'all');

        const result = rolePermissions.forRoles(['Administrator']);

        assert.deepEqual(actionsFor(result, 'db'), [...permissionData.db].sort());
      });

      it('expands a list to exactly those actions', function () {
        const expected = roleValues.Contributor.post;
        assert(Array.isArray(expected));
        assert(expected.length < permissionData.post.length);

        const result = rolePermissions.forRoles(['Contributor']);

        assert.deepEqual(actionsFor(result, 'post'), [...expected].sort());
      });

      it('grants nothing for an object type the role does not list', function () {
        assert.equal(roleValues.Contributor.db, undefined);

        const result = rolePermissions.forRoles(['Contributor']);

        assert.deepEqual(actionsFor(result, 'db'), []);
      });

      it('does not grant publish:post to Contributor', function () {
        assert(!toKeys(rolePermissions.forRoles(['Contributor'])).includes('publish:post'));
        assert(toKeys(rolePermissions.forRoles(['Editor'])).includes('publish:post'));
      });

      it('returns an empty array for an unknown role', function () {
        assert.deepEqual(rolePermissions.forRoles(['Not A Role']), []);
      });

      it('returns an empty array for Owner', function () {
        assert.equal(roleValues.Owner, undefined);
        assert.deepEqual(rolePermissions.forRoles(['Owner']), []);
      });

      it('returns an empty array for no roles', function () {
        assert.deepEqual(rolePermissions.forRoles([]), []);
      });

      it('unions permissions across roles without duplicates', function () {
        const editor = toKeys(rolePermissions.forRoles(['Editor']));
        const author = toKeys(rolePermissions.forRoles(['Author']));
        const combined = toKeys(rolePermissions.forRoles(['Editor', 'Author']));

        assert.deepEqual(combined, [...new Set([...editor, ...author])].sort());
        assert.equal(new Set(combined).size, combined.length);
        assert(author.some((key) => editor.includes(key)));
      });
    });

    describe('data file', function () {
      it('only grants actions that exist for the object type', function () {
        for (const [roleName, objects] of Object.entries(roleValues)) {
          for (const [objectType, value] of Object.entries(objects)) {
            const actions = (permissionData as Record<string, readonly string[]>)[objectType];

            assert(actions, `${roleName}: unknown object type ${objectType}`);

            if (value !== 'all') {
              assert(value.length > 0, `${roleName}.${objectType} grants nothing`);

              for (const action of value) {
                assert(
                  actions.includes(action),
                  `${roleName}: ${action}:${objectType} does not exist`,
                );
              }
            }
          }
        }
      });

      // The permissions tables are still seeded from fixtures.json at install,
      // so the data file has to agree with it. Both fixtures files are checked
      // because the test database is seeded from the test copy. Remove this
      // test once fixtures.json stops carrying permissions.
      for (const [label, fixturesPath] of [
        ['production fixtures', '../../../../../core/server/data/schema/fixtures/fixtures.json'],
        ['test fixtures', '../../../../utils/fixtures/fixtures.json'],
      ]) {
        it(`matches the ${label} as the fixture manager expands them`, function () {
          const fixtures = require(fixturesPath);
          const permissionModels = fixtures.models
            .find((model: { name: string }) => model.name === 'Permission')
            .entries.map((entry: Permission) => models.Permission.forge(entry));
          const relation = fixtures.relations.find(
            (rel: { from: { model: string }; to: { model: string } }) =>
              rel.from.model === 'Role' && rel.to.model === 'Permission',
          );

          const fixturePairs = permissionModels.map((perm: { get: (key: string) => string }) => ({
            action_type: perm.get('action_type'),
            object_type: perm.get('object_type'),
          }));
          assert.deepEqual(toKeys(rolePermissions.all()), toKeys(fixturePairs));

          assert.deepEqual(
            [...rolePermissions.roleNames()].sort(),
            Object.keys(relation.entries).sort(),
          );

          // FixtureManager.matchFunc is what seeds permissions_roles.
          for (const [roleName, objects] of Object.entries(relation.entries)) {
            const expected = permissionModels
              .filter((perm: { get: (key: string) => string }) =>
                Object.entries(objects as Record<string, string | string[]>).some(
                  ([objectType, value]) =>
                    FixtureManager.matchFunc(relation.to.match, objectType, value)(perm),
                ),
              )
              .map((perm: { get: (key: string) => string }) => ({
                action_type: perm.get('action_type'),
                object_type: perm.get('object_type'),
              }));

            assert(expected.length > 0, `${roleName} should have permissions`);
            assert.deepEqual(
              toKeys(rolePermissions.forRoles([roleName])),
              toKeys(expected),
              roleName,
            );
          }
        });
      }
    });
  });
});
