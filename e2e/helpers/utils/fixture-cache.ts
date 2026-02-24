import * as fs from 'fs';
import * as path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const E2E_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(E2E_ROOT, '..');

export const CANONICAL_ADMIN_ORIGIN = 'http://localhost:2368';
export const SNAPSHOT_PATH = '/tmp/dump.sql';
export const FORCE_FIXTURE_RESET_ENV = 'E2E_FORCE_FIXTURE_RESET';

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

export function shouldForceFixtureReset(): boolean {
    const raw = process.env[FORCE_FIXTURE_RESET_ENV];
    return raw === '1' || raw === 'true';
}

export function getMissingAuthStateFiles(): string[] {
    return Object.values(AUTH_STATE_BY_ROLE).filter(file => !fs.existsSync(file));
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

export async function getLatestMigrationFileName(): Promise<string | null> {
    const files = await collectMigrationFiles(MIGRATIONS_DIR);
    const migrationNames = files.map(file => path.basename(file));

    if (migrationNames.length === 0) {
        return null;
    }

    return migrationNames.sort().at(-1) || null;
}
