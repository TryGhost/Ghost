// The rules that turn a CI run's changes into the project lists job_setup
// hands to the rest of ci.yml. nx access is injected so the rules are testable.

/**
 * @typedef {object} ShowProjectsQuery
 * @property {boolean} affected - false selects every project
 * @property {string} [withTarget]
 * @property {string} [projects] - an nx project pattern, e.g. 'tag:i18n'
 */

/**
 * @typedef {object} AffectedInputs
 * @property {boolean} isTag - a release tag build: everything runs, nothing publishes
 * @property {boolean} codeChanged - false when every changed file is documentation
 * @property {boolean} ciChanged - CI files changed: every test lane runs everything
 * @property {boolean} rootDependenciesChanged - the root importer's resolved
 *   dependencies changed; packages run root tools they don't declare, so every
 *   test lane runs everything
 * @property {boolean} unitTestGlobalsChanged - every project's unit tests run
 * @property {boolean} coreUnitTestGlobalsChanged - Ghost core's unit tests run
 */

/**
 * Splits each acceptance-test project into shards; Admin gets two runners.
 *
 * @param {string[]} projects
 */
export function playwrightMatrix(projects) {
  return projects.flatMap((app) => {
    const shardTotal = app === '@tryghost/admin' ? 2 : 1;
    return Array.from({ length: shardTotal }, (_, i) => ({
      app,
      shardIndex: i + 1,
      shardTotal,
    }));
  });
}

/**
 * @param {AffectedInputs} inputs
 * @param {(query: ShowProjectsQuery) => Promise<string[]>} showProjects
 * @param {(projects: string[]) => object[]} buildPublishMatrix
 * @returns {Promise<Record<string, string>>} step outputs, values serialized
 */
export async function computeAffectedOutputs(inputs, showProjects, buildPublishMatrix) {
  // nx treats README files as project inputs, so a docs-only change would
  // otherwise populate the code-test matrices.
  if (!inputs.isTag && !inputs.codeChanged) {
    return serialize({
      affectedProjects: [],
      typecheckProjects: [],
      unitTestProjects: [],
      i18nProjects: [],
      playwrightMatrix: [],
      publishMatrix: [],
    });
  }

  const affected = !(inputs.ciChanged || inputs.rootDependenciesChanged || inputs.isTag);

  const affectedProjects = await showProjects({ affected });
  const typecheckProjects = await showProjects({ affected, withTarget: 'test:types' });

  let unitTestProjects = await showProjects({
    affected: affected && !inputs.unitTestGlobalsChanged,
    withTarget: 'test:unit',
  });
  if (inputs.coreUnitTestGlobalsChanged && !unitTestProjects.includes('ghost')) {
    unitTestProjects = [...unitTestProjects, 'ghost'];
  }

  // "i18n" tag = packages whose source is scanned by @tryghost/i18n's
  // translate:* scripts (not packages that merely import @tryghost/i18n).
  const i18nProjects = await showProjects({ affected, projects: 'tag:i18n' });

  // "playwright" tag = projects whose test:acceptance suite runs in
  // job_apps_acceptance-tests, so the matrix isn't tied to directory layout.
  const playwrightProjects = await showProjects({
    affected,
    withTarget: 'test:acceptance',
    projects: 'tag:playwright',
  });

  // Publishing follows real affected-ness even when the test lanes widened to
  // everything; tags never publish (the publish job also gates on main).
  let publishProjects = [];
  if (!inputs.isTag) {
    publishProjects = affected ? affectedProjects : await showProjects({ affected: true });
  }

  return serialize({
    affectedProjects,
    typecheckProjects,
    unitTestProjects,
    i18nProjects,
    playwrightMatrix: playwrightMatrix(playwrightProjects),
    publishMatrix: buildPublishMatrix(publishProjects),
  });
}

// Output names and formats are ci.yml's contract with job_setup's consumers.
function serialize(result) {
  return {
    affected_projects: JSON.stringify(result.affectedProjects),
    // comma-separated for `nx run-many -p`
    affected_projects_str: result.affectedProjects.join(','),
    typecheck_projects_str: result.typecheckProjects.join(','),
    unit_test_projects_str: result.unitTestProjects.join(','),
    affected_i18n_projects: result.i18nProjects.join(','),
    affected_playwright_matrix: JSON.stringify(result.playwrightMatrix),
    publish_public_apps_matrix: JSON.stringify(result.publishMatrix),
  };
}
