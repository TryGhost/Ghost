import { describe, it } from 'node:test';
import assert from 'node:assert';

import { computeAffectedOutputs, playwrightMatrix } from '../lib/affected-projects.js';

const ALL = ['ghost', '@tryghost/admin', '@tryghost/portal', '@tryghost/i18n'];
const AFFECTED = ['@tryghost/portal', '@tryghost/i18n'];

const TARGETS = {
  'test:types': ['@tryghost/admin', '@tryghost/portal'],
  'test:unit': ['ghost', '@tryghost/portal', '@tryghost/i18n'],
  'test:acceptance': ['@tryghost/admin', '@tryghost/portal'],
};
const TAGS = {
  'tag:i18n': ['@tryghost/portal', 'ghost'],
  'tag:playwright': ['@tryghost/admin', '@tryghost/portal'],
};

// A stand-in for `nx show projects` that records every query it answers.
function fakeNx() {
  const queries = [];
  const showProjects = async (query) => {
    queries.push(query);
    return (query.affected ? AFFECTED : ALL).filter(
      (project) =>
        (!query.withTarget || TARGETS[query.withTarget].includes(project)) &&
        (!query.projects || TAGS[query.projects].includes(project)),
    );
  };
  return { queries, showProjects };
}

const publishMatrix = (projects) => projects.map((name) => ({ package_name: name }));

const inputs = (overrides = {}) => ({
  isTag: false,
  codeChanged: true,
  ciChanged: false,
  rootDependenciesChanged: false,
  unitTestGlobalsChanged: false,
  coreUnitTestGlobalsChanged: false,
  ...overrides,
});

describe('computeAffectedOutputs', () => {
  it('scopes every list to affected projects', async () => {
    const nx = fakeNx();
    const outputs = await computeAffectedOutputs(inputs(), nx.showProjects, publishMatrix);

    assert.deepStrictEqual(outputs, {
      affected_projects: JSON.stringify(AFFECTED),
      affected_projects_str: '@tryghost/portal,@tryghost/i18n',
      typecheck_projects_str: '@tryghost/portal',
      unit_test_projects_str: '@tryghost/portal,@tryghost/i18n',
      affected_i18n_projects: '@tryghost/portal',
      affected_playwright_matrix: JSON.stringify([
        { app: '@tryghost/portal', shardIndex: 1, shardTotal: 1 },
      ]),
      publish_public_apps_matrix: JSON.stringify(publishMatrix(AFFECTED)),
    });
    assert.ok(nx.queries.every((query) => query.affected));
  });

  it('runs nothing for documentation-only changes', async () => {
    const nx = fakeNx();
    const outputs = await computeAffectedOutputs(
      inputs({ codeChanged: false }),
      nx.showProjects,
      publishMatrix,
    );

    assert.strictEqual(outputs.affected_projects, '[]');
    assert.strictEqual(outputs.affected_projects_str, '');
    assert.strictEqual(outputs.publish_public_apps_matrix, '[]');
    assert.deepStrictEqual(nx.queries, []);
  });

  it('tests everything but publishes only affected apps when CI files change', async () => {
    const nx = fakeNx();
    const outputs = await computeAffectedOutputs(
      inputs({ ciChanged: true }),
      nx.showProjects,
      publishMatrix,
    );

    assert.strictEqual(outputs.affected_projects, JSON.stringify(ALL));
    assert.strictEqual(outputs.publish_public_apps_matrix, JSON.stringify(publishMatrix(AFFECTED)));
  });

  it('tests everything but publishes only affected apps when root dependencies change', async () => {
    const nx = fakeNx();
    const outputs = await computeAffectedOutputs(
      inputs({ rootDependenciesChanged: true }),
      nx.showProjects,
      publishMatrix,
    );

    assert.strictEqual(outputs.affected_projects, JSON.stringify(ALL));
    assert.strictEqual(outputs.unit_test_projects_str, 'ghost,@tryghost/portal,@tryghost/i18n');
    assert.strictEqual(outputs.publish_public_apps_matrix, JSON.stringify(publishMatrix(AFFECTED)));
  });

  it('tests everything and publishes nothing on tags, even without code changes', async () => {
    const nx = fakeNx();
    const outputs = await computeAffectedOutputs(
      inputs({ isTag: true, codeChanged: false }),
      nx.showProjects,
      publishMatrix,
    );

    assert.strictEqual(outputs.affected_projects, JSON.stringify(ALL));
    assert.strictEqual(outputs.publish_public_apps_matrix, '[]');
    assert.ok(nx.queries.every((query) => !query.affected));
  });

  it('runs every unit test when the shared unit test config changes', async () => {
    const nx = fakeNx();
    const outputs = await computeAffectedOutputs(
      inputs({ unitTestGlobalsChanged: true }),
      nx.showProjects,
      publishMatrix,
    );

    assert.strictEqual(outputs.unit_test_projects_str, 'ghost,@tryghost/portal,@tryghost/i18n');
    assert.strictEqual(outputs.typecheck_projects_str, '@tryghost/portal');
  });

  it("adds Ghost core's unit tests once when its test config changes", async () => {
    const nx = fakeNx();
    const scoped = await computeAffectedOutputs(
      inputs({ coreUnitTestGlobalsChanged: true }),
      nx.showProjects,
      publishMatrix,
    );
    assert.strictEqual(scoped.unit_test_projects_str, '@tryghost/portal,@tryghost/i18n,ghost');

    const everything = await computeAffectedOutputs(
      inputs({ unitTestGlobalsChanged: true, coreUnitTestGlobalsChanged: true }),
      nx.showProjects,
      publishMatrix,
    );
    assert.strictEqual(everything.unit_test_projects_str, 'ghost,@tryghost/portal,@tryghost/i18n');
  });
});

describe('playwrightMatrix', () => {
  it('gives Admin two shards and every other app one', () => {
    assert.deepStrictEqual(playwrightMatrix(['@tryghost/admin', '@tryghost/activitypub']), [
      { app: '@tryghost/admin', shardIndex: 1, shardTotal: 2 },
      { app: '@tryghost/admin', shardIndex: 2, shardTotal: 2 },
      { app: '@tryghost/activitypub', shardIndex: 1, shardTotal: 1 },
    ]);
  });
});
