import * as fs from 'fs';
import * as path from 'path';
import {createHash} from 'crypto';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const E2E_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(E2E_ROOT, '..');

export const CANONICAL_ADMIN_ORIGIN = 'http://localhost:2368';
export const SNAPSHOT_PATH = '/tmp/dump.sql';
export const FORCE_FIXTURE_RESET_ENV = 'E2E_FORCE_FIXTURE_RESET';
export const FIXTURE_CACHE_VERSION = 2;

export type FixtureRole = 'owner' | 'administrator' | 'editor' | 'author' | 'contributor';
export type StaffFixtureRole = Exclude<FixtureRole, 'owner'>;

const MIGRATIONS_DIR = path.join(
    REPO_ROOT,
    'ghost',
    'core',
    'core',
    'server',
    'data',
    'migrations',
    'versions'
);

const CACHE_FINGERPRINT_FILES = [
    'docker/dev-gateway/Caddyfile',
    'docker/dev-gateway/Caddyfile.build',
    'e2e/package.json',
    'e2e/playwright.config.mjs',
    'e2e/data-factory/factories/user-factory.ts',
    'e2e/data-factory/index.ts',
    'e2e/helpers/pages/admin/admin-page.ts',
    'e2e/helpers/pages/admin/analytics/analytics-overview-page.ts',
    'e2e/helpers/pages/admin/login-page.ts',
    'e2e/helpers/pages/admin/settings/settings-page.ts',
    'e2e/helpers/pages/admin/settings/sections/staff-section.ts',
    'e2e/helpers/pages/admin/signup-page.ts',
    'e2e/helpers/playwright/context-with-auth-state.ts',
    'e2e/helpers/playwright/flows/sign-in.ts',
    'e2e/helpers/playwright/fixture.ts',
    'e2e/helpers/services/email/utils.ts',
    'e2e/helpers/utils/fixture-cache.ts',
    'e2e/helpers/utils/setup-user.ts',
    'e2e/tests/global.setup.ts'
];

export const STATE_DIR = path.join(E2E_ROOT, 'data', 'state');
export const AUTH_STATE_DIR = path.join(STATE_DIR, 'auth');

export const FIXTURE_ROLES: FixtureRole[] = ['owner', 'administrator', 'editor', 'author', 'contributor'];

export const AUTH_STATE_BY_ROLE: Record<FixtureRole, string> = {
    owner: path.join(AUTH_STATE_DIR, 'owner.json'),
    administrator: path.join(AUTH_STATE_DIR, 'administrator.json'),
    editor: path.join(AUTH_STATE_DIR, 'editor.json'),
    author: path.join(AUTH_STATE_DIR, 'author.json'),
    contributor: path.join(AUTH_STATE_DIR, 'contributor.json')
};

export interface FixtureCacheManifest {
    version: number;
    latestMigration: string;
    roles: FixtureRole[];
    fingerprint: string;
    files: Record<string, string>;
}

export function shouldForceFixtureReset(): boolean {
    const raw = process.env[FORCE_FIXTURE_RESET_ENV];
    return raw === '1' || raw === 'true';
}

export function getMissingAuthStateFiles(): string[] {
    return Object.values(AUTH_STATE_BY_ROLE).filter(file => !fs.existsSync(file));
}

function hashText(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

async function hashFile(relativePath: string): Promise<string> {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const contents = await fs.promises.readFile(absolutePath);
    return createHash('sha256').update(contents).digest('hex');
}

async function collectMigrationFiles(rootDir: string): Promise<string[]> {
    const entries = await fs.promises.readdir(rootDir, {withFileTypes: true});
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectMigrationFiles(fullPath));
            continue;
        }

        if (entry.isFile() && fullPath.endsWith('.js')) {
            files.push(fullPath);
        }
    }

    return files;
}

async function getMigrationFilesFingerprint(): Promise<string> {
    const files = await collectMigrationFiles(MIGRATIONS_DIR);
    const migrationHashes: Record<string, string> = {};

    for (const file of files.sort()) {
        const relativePath = path.relative(REPO_ROOT, file).split(path.sep).join('/');
        migrationHashes[relativePath] = await hashFile(relativePath);
    }

    return hashText(JSON.stringify(migrationHashes));
}

export async function getLatestMigrationFileName(): Promise<string | null> {
    const files = await collectMigrationFiles(MIGRATIONS_DIR);
    const migrationNames = files.map(file => path.basename(file));

    if (migrationNames.length === 0) {
        return null;
    }

    return migrationNames.sort().at(-1) || null;
}

export async function createFixtureCacheManifest(latestMigrationFileName?: string | null): Promise<FixtureCacheManifest> {
    const latestMigration = latestMigrationFileName ?? await getLatestMigrationFileName();
    if (!latestMigration) {
        throw new Error('Cannot create E2E fixture cache manifest without migration files.');
    }

    const files: Record<string, string> = {};
    for (const relativePath of CACHE_FINGERPRINT_FILES) {
        files[relativePath] = await hashFile(relativePath);
    }

    files['ghost/core/core/server/data/migrations/versions'] = await getMigrationFilesFingerprint();

    const manifestIdentity = {
        version: FIXTURE_CACHE_VERSION,
        latestMigration,
        roles: FIXTURE_ROLES,
        files
    };

    return {
        ...manifestIdentity,
        fingerprint: hashText(JSON.stringify(manifestIdentity))
    };
}

export function isFixtureCacheManifestCurrent(actual: FixtureCacheManifest | null, expected: FixtureCacheManifest): boolean {
    if (!actual) {
        return false;
    }

    return actual.version === expected.version &&
        actual.latestMigration === expected.latestMigration &&
        actual.fingerprint === expected.fingerprint &&
        JSON.stringify(actual.roles) === JSON.stringify(expected.roles);
}
