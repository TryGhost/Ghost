import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

// Metadata only: this entrypoint is checked out from the trusted workflow commit.
export function previewProfile(pr) {
  const labels = pr.labels.filter((label) => label === 'preview' || label.startsWith('preview:'));
  if (pr.state !== 'open' || !labels.length) {
    return { skip: true };
  }
  const profiles = labels.filter((label) => label.startsWith('preview:'));
  if (profiles.length > 1) {
    throw new Error(
      `Multiple preview profile labels (${profiles.join(', ')}) — remove all but one`,
    );
  }
  const profile = profiles[0]?.slice('preview:'.length) ?? '';
  if (
    profiles.length &&
    (profile.trim() !== profile || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(profile))
  ) {
    throw new Error(`Malformed profile label: ${JSON.stringify(profiles[0])}`);
  }
  return { skip: false, profile };
}

export async function checkPreview({ api, repository, prNumber, jobName }) {
  const pr = await api(`pulls/${prNumber}`);
  if (previewProfile({ state: pr.state, labels: pr.labels.map((label) => label.name) }).skip) {
    return { skip: true };
  }
  if (pr.head.repo?.full_name !== repository) {
    throw new Error('Fork PR images are not published to GHCR, so this PR cannot have a preview');
  }
  const sha = pr.head.sha;
  if (sha?.length !== 40 || !/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error('Invalid PR head SHA');
  }
  // Any successful build of the live head counts, including reopen/rerun CI.
  const pages = await api(`actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=100`, true);
  const runs = pages.flatMap((page) => page.workflow_runs);
  let pending = false;
  let failed = '';
  for (const run of runs) {
    const jobPages = await api(`actions/runs/${run.id}/jobs?per_page=100`, true);
    const jobs = jobPages.flatMap((page) => page.jobs).filter((job) => job.name === jobName);
    for (const job of jobs) {
      if (job.status === 'completed' && job.conclusion === 'success') {
        console.log(`Image for ${sha} is built (CI run ${run.id})`);
        return { skip: false, head_sha: sha };
      }
      if (job.status === 'completed') {
        failed = job.conclusion;
      } else {
        pending = true;
      }
    }
    if (!jobs.length && run.status !== 'completed') {
      pending = true;
    }
  }
  if (pending || !runs.length) {
    console.log(`Image for ${sha} is not built yet; CI deploys the preview when it is`);
    return { skip: true };
  }
  throw new Error(
    `${jobName} for ${sha} did not succeed (${failed || 'not run'}); push a fix to deploy the preview`,
  );
}

export function keepPreview(pr) {
  return (
    pr.state === 'open' &&
    pr.labels.some(({ name }) => name === 'preview' || name.startsWith('preview:'))
  );
}

async function main(operation) {
  const { PR_NUMBER: prNumber, REPOSITORY: repository, BUILD_JOB_NAME: jobName } = process.env;
  if (prNumber?.trim() !== prNumber || !/^[1-9][0-9]{0,9}$/.test(prNumber ?? '')) {
    throw new Error('Invalid PR number');
  }
  const api = (path, paginate = false) =>
    JSON.parse(
      execFileSync(
        'gh',
        ['api', ...(paginate ? ['--paginate', '--slurp'] : []), `repos/${repository}/${path}`],
        { encoding: 'utf8' },
      ),
    );
  let result;
  if (operation === 'check') {
    result = await checkPreview({ api, repository, prNumber, jobName });
  } else if (operation === 'teardown') {
    result = { skip: keepPreview(await api(`pulls/${prNumber}`)) };
  } else {
    throw new Error(`Unknown operation: ${operation}`);
  }
  for (const [key, value] of Object.entries(result)) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

if (import.meta.main) {
  main(process.argv[2]).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
