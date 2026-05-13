import path from 'path';
import {z} from 'zod';
import semver from 'semver';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type {NotificationService, NotificationInput} from '../../service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../../../../shared/config') as {get(key: string): unknown};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ghostVersion = require('@tryghost/version') as {original: string};

export interface JobsService {
    addJob(spec: {at: string; job: string; name: string}): void;
}

const JOB_NAME = 'ghsa-check';

const Vulnerability = z.object({
    package: z.object({
        ecosystem: z.string(),
        name: z.string()
    }),
    vulnerable_version_range: z.string()
});

export const Advisory = z.object({
    ghsa_id: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    html_url: z.string(),
    state: z.string(),
    vulnerabilities: z.array(Vulnerability)
});

export type Advisory = z.input<typeof Advisory>;

const AdvisoryList = z.array(Advisory);

function isCheckEnabled(): boolean {
    return config.get('updateCheck:enabled') !== false;
}

export async function fetchAdvisories(fetchImpl: typeof fetch = fetch): Promise<Advisory[]> {
    const endpoint = config.get('updateCheck:advisoriesUrl') as string;

    const response = await fetchImpl(endpoint, {
        headers: {
            'User-Agent': 'ghost-ghsa-feed',
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });

    if (!response.ok) {
        throw new errors.InternalServerError({
            message: `GHSA fetch failed: ${response.status} ${response.statusText}`
        });
    }

    const raw = await response.json();
    return AdvisoryList.parse(raw);
}

export function toNotificationInputs(
    advisories: Advisory[],
    runningVersion: string
): NotificationInput[] {
    return advisories
        .filter(a => isActionable(a, runningVersion))
        .map(a => mapAdvisory(a));
}

function isActionable(advisory: Advisory, runningVersion: string): boolean {
    if (advisory.state !== 'published') {
        return false;
    }
    if (advisory.severity !== 'high' && advisory.severity !== 'critical') {
        return false;
    }
    return advisory.vulnerabilities.some((v) => {
        if (v.package.ecosystem.toLowerCase() !== 'npm') {
            return false;
        }
        if (v.package.name.toLowerCase() !== 'ghost') {
            return false;
        }
        // GitHub's vulnerable_version_range is free-form text. Future Ghost
        // advisories should use valid npm semver ranges; legacy entries with
        // formats like "X && Y" or "A.B.C-X.Y.Z" will fail to parse and be
        // treated as not-affected.
        if (semver.validRange(v.vulnerable_version_range, {includePrerelease: true}) === null) {
            logging.warn(
                {
                    event: {name: 'ghsa.parse-range.invalid'},
                    ghsa_id: advisory.ghsa_id,
                    vulnerable_version_range: v.vulnerable_version_range
                },
                'Advisory has unparseable vulnerable_version_range'
            );
            return false;
        }
        return semver.satisfies(runningVersion, v.vulnerable_version_range, {
            includePrerelease: true
        });
    });
}

function mapAdvisory(advisory: Advisory): NotificationInput {
    const isCritical = advisory.severity === 'critical';
    const link = `<a href="${advisory.html_url}">${advisory.ghsa_id}</a>`;
    return {
        id: `ghsa-${advisory.ghsa_id}`,
        custom: true,
        type: isCritical ? 'alert' : 'info',
        dismissible: true,
        top: true,
        message: `A security advisory has been published (${link}). Please update your Ghost install as soon as possible.`,
        ...(isCritical ? {template: 'critical-update'} : {})
    };
}

export async function runCheck(
    notifications: NotificationService,
    fetchImpl?: typeof fetch
): Promise<void> {
    let advisories: Advisory[];
    try {
        advisories = await fetchAdvisories(fetchImpl);
    } catch (err) {
        logging.error(
            {
                event: {name: 'ghsa.fetch-advisories.error'},
                err
            },
            'Failed to fetch GHSA advisories'
        );
        return;
    }

    const inputs = toNotificationInputs(advisories, ghostVersion.original);
    if (inputs.length === 0) {
        return;
    }

    await notifications.add(inputs);
}

export function register(jobsService: JobsService): void {
    if (!isCheckEnabled()) {
        return;
    }

    const s = Math.floor(Math.random() * 60);
    const m = Math.floor(Math.random() * 60);
    const h = Math.floor(Math.random() * 24);

    // Use the same extension as the currently-loaded module so the worker
    // points at .ts in dev (tsx loader) and .js after tsc compile in prod.
    const workerPath = path.resolve(__dirname, `worker${path.extname(__filename)}`);

    jobsService.addJob({
        at: `${s} ${m} ${h} * * *`,
        job: workerPath,
        name: JOB_NAME
    });
}
