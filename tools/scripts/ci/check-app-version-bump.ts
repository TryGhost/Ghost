// Verifies, on every PR touching a CDN-served app, that the app's package.json
// major.minor still matches the version pinned in defaults.json. See
// lib/publish-manifest.ts for why that invariant matters.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  CDN_PACKAGES,
  DEFAULTS_PATH,
  DEFAULTS_REPO_PATH,
  majorMinor,
  type ContinuousPackage,
} from '../lib/publish-manifest.ts';
import { resolveBaseCommit } from './pr-base.ts';

type PublicApp = ContinuousPackage;

const MONITORED_APP_PATHS = CDN_PACKAGES.map((app) => app.path);

function errorMessage(error: unknown): string {
  return (error as Error).message;
}

function runGit(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (err) {
    const error = err as Error & { stdout?: Buffer | string; stderr?: Buffer | string };
    const stderr = error.stderr ? error.stderr.toString().trim() : '';
    const stdout = error.stdout ? error.stdout.toString().trim() : '';
    const message = stderr || stdout || error.message;
    throw new Error(`Failed to run "git ${args.join(' ')}": ${message}`);
  }
}

function readVersionFromPackageJson(packageJsonContent: string, sourceLabel: string): string {
  let parsedPackageJson: { version?: unknown };

  try {
    parsedPackageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    throw new Error(`Unable to parse ${sourceLabel}: ${errorMessage(error)}`);
  }

  if (!parsedPackageJson.version || typeof parsedPackageJson.version !== 'string') {
    throw new Error(`${sourceLabel} does not contain a valid "version" field`);
  }

  return parsedPackageJson.version;
}

function getChangedFiles(baseSha: string, compareSha: string): string[] {
  let mergeBaseSha: string;

  try {
    mergeBaseSha = runGit(['merge-base', baseSha, compareSha]);
  } catch (error) {
    throw new Error(
      `Unable to determine merge-base for ${baseSha} and ${compareSha}. Ensure the base branch history is available in the checkout.\n${errorMessage(error)}`,
    );
  }

  return runGit(['diff', '--name-only', mergeBaseSha, compareSha, '--', ...MONITORED_APP_PATHS])
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean);
}

function getChangedAppFiles(app: PublicApp, changedFiles: string[]): string[] {
  return changedFiles.filter((file) => {
    return file === app.path || file.startsWith(`${app.path}/`);
  });
}

function getChangedApps(changedFiles: string[]): PublicApp[] {
  return CDN_PACKAGES.filter((app) => getChangedAppFiles(app, changedFiles).length > 0);
}

function getPrVersion(app: PublicApp): string {
  const packageJsonPath = join(import.meta.dirname, '../../..', app.path, 'package.json');

  if (!existsSync(packageJsonPath)) {
    throw new Error(`${app.path}/package.json does not exist in this PR`);
  }

  return readVersionFromPackageJson(
    readFileSync(packageJsonPath, 'utf8'),
    `${app.path}/package.json from PR`,
  );
}

function readVersionFromDefaults(
  defaultsContent: string,
  app: PublicApp,
  sourceLabel: string,
): string {
  let parsedDefaults: Record<string, { version?: unknown } | undefined>;

  try {
    parsedDefaults = JSON.parse(defaultsContent);
  } catch (error) {
    throw new Error(`Unable to parse ${sourceLabel}: ${errorMessage(error)}`);
  }

  const appDefaults = parsedDefaults[app.cdn!];

  if (!appDefaults || typeof appDefaults.version !== 'string') {
    throw new Error(`${sourceLabel} does not contain a valid "${app.cdn}.version" field`);
  }

  return appDefaults.version;
}

function getPrDefaultsVersion(app: PublicApp): string {
  if (!existsSync(DEFAULTS_PATH)) {
    throw new Error(`${DEFAULTS_REPO_PATH} does not exist in this PR`);
  }

  return readVersionFromDefaults(
    readFileSync(DEFAULTS_PATH, 'utf8'),
    app,
    `${DEFAULTS_REPO_PATH} from PR`,
  );
}

/**
 * Patch releases are published automatically on merge to main, with npm as the
 * source of truth for the patch number — so PRs no longer need to bump the
 * version at all. The only invariant we still enforce is that package.json's
 * major.minor matches defaults.json, because Ghost core serves each app from
 * `<pkg>@~<major.minor>` on jsDelivr. A deliberate minor/major release (via
 * "pnpm ship") must move both in lockstep, or live sites would point at a
 * version line that never gets published.
 *
 * Returns an error message when inconsistent, otherwise null.
 */
export function checkAppConsistency(
  app: PublicApp,
  prVersion: string,
  prDefaultsVersion: string,
): string | null {
  const prMajorMinorVersion = majorMinor(prVersion);

  if (prDefaultsVersion !== prMajorMinorVersion) {
    return `${app.cdn} (${app.name}): package.json is on ${prMajorMinorVersion} but defaults.json has ${app.cdn}.version set to ${prDefaultsVersion}. These must match — for a minor/major release run "pnpm ship" in ${app.path} (it updates both), otherwise align ${DEFAULTS_REPO_PATH} to ${prMajorMinorVersion}.`;
  }

  return null;
}

function main() {
  const baseSha = resolveBaseCommit();
  const compareSha = process.env.PR_COMPARE_SHA || process.env.GITHUB_SHA;

  if (!baseSha) {
    throw new Error('Missing PR_BASE_SHA environment variable');
  }

  if (!compareSha) {
    throw new Error('Missing PR_COMPARE_SHA/GITHUB_SHA environment variable');
  }

  const changedFiles = getChangedFiles(baseSha, compareSha);
  const changedApps = getChangedApps(changedFiles);

  if (changedApps.length === 0) {
    console.log(`No app changes detected. Skipping app version consistency check.`);
    return;
  }

  console.log(
    `Checking app version consistency for: ${changedApps.map((app) => app.cdn).join(', ')}`,
  );

  const failedApps: string[] = [];

  for (const app of changedApps) {
    const error = checkAppConsistency(app, getPrVersion(app), getPrDefaultsVersion(app));

    if (error) {
      failedApps.push(error);
      continue;
    }

    console.log(
      `${app.cdn} version consistency check passed (package.json ${majorMinor(getPrVersion(app))} = defaults.json ${getPrDefaultsVersion(app)})`,
    );
  }

  if (failedApps.length) {
    throw new Error(`App version consistency checks failed:\n- ${failedApps.join('\n- ')}`);
  }

  console.log('All monitored app version consistency checks passed.');
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(errorMessage(error));
    process.exit(1);
  }
}
