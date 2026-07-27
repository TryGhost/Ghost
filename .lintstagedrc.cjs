const path = require('path');
const fs = require('fs');
const {quote: shellQuote} = require('shell-quote');
const pm = require('picomatch');

const ROOT = process.cwd();
const ESLINT_FILES = new Set(['.js', '.ts', '.tsx', '.jsx', '.cjs']);

function normalize(p) {
    return p.split(path.sep).join('/');
}

// Parse the `packages:` list from pnpm-workspace.yaml. We only need the simple
// glob shapes pnpm allows here (`apps/*`, `ghost/*`, `e2e`); anything fancier
// would warrant a real YAML parser.
function loadWorkspacePatterns() {
    const yaml = fs.readFileSync(path.join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
    const lines = yaml.split('\n');
    const start = lines.findIndex(line => /^packages:\s*$/.test(line));
    if (start === -1) {
        return [];
    }
    const patterns = [];
    for (let i = start + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s+-\s+/.test(line)) {
            const match = line.match(/^\s+-\s+['"]?([^'"\s]+)['"]?\s*$/);
            if (match) {
                patterns.push(match[1]);
            }
        } else if (line.trim() !== '' && !/^\s/.test(line)) {
            break;
        }
    }
    return patterns;
}

function expandPattern(pattern) {
    const segments = pattern.split('/');
    let candidates = [''];
    for (const segment of segments) {
        const next = [];
        for (const base of candidates) {
            const dir = base ? path.join(ROOT, base) : ROOT;
            if (segment === '*') {
                if (!fs.existsSync(dir)) {
                    continue;
                }
                for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
                    if (entry.isDirectory()) {
                        next.push(base ? `${base}/${entry.name}` : entry.name);
                    }
                }
            } else {
                const candidate = base ? `${base}/${segment}` : segment;
                if (fs.existsSync(path.join(ROOT, candidate))) {
                    next.push(candidate);
                }
            }
        }
        candidates = next;
    }
    return candidates;
}

const WORKSPACES = new Set(loadWorkspacePatterns().flatMap(expandPattern));

function findWorkspace(file) {
    let dir = path.dirname(path.resolve(file));
    while (dir.startsWith(ROOT) && dir !== ROOT) {
        const rel = normalize(path.relative(ROOT, dir));
        if (WORKSPACES.has(rel)) {
            return rel;
        }
        dir = path.dirname(dir);
    }
    return null;
}

/**
 * @param {ReadonlyArray<string>} files
 * @returns {string}
 */
function buildOxfmtCommand(files) {
    const relativeFiles = files.map(file => normalize(path.relative(ROOT, file)));
    return `pnpm exec oxfmt --no-error-on-unmatched-pattern -- ${shellQuote(relativeFiles)}`;
}

function buildEslintCommand(workspace, files) {
    const base = workspace ? path.join(ROOT, workspace) : ROOT;
    const relativeFiles = files.map(file => normalize(path.relative(base, file)));
    const dirArg = workspace ? `--dir ${shellQuote([workspace])} ` : '';
    return `pnpm ${dirArg}exec eslint --cache -- ${shellQuote(relativeFiles)}`;
}

function buildBoundaryCommand(files) {
    const relativeFiles = files.map(file => normalize(path.relative(ROOT, file)));
    return `pnpm exec depcruise --config .dependency-cruiser.cjs -- ${shellQuote(relativeFiles)}`;
}

function buildEmberTemplateLintCommand(files) {
    const workspace = 'apps/ember-admin';
    const base = path.join(ROOT, workspace);
    const relativeFiles = files
        .map(file => normalize(path.relative(base, file)))
        .map(shellQuote)
        .join(' ');
    return `pnpm --dir ${shellQuote(workspace)} exec ember-template-lint ${relativeFiles}`;
}

/**
 * @param {string[]} files
 * @returns {string[]}
 */
module.exports = files => {
    /** @type {Map<null | string, Set<string>>} */ const workspaceFiles = new Map();
    /** @type {Set<string>} */ const boundaries = new Set();
    /** @type {Set<string>} */ const emberAdminTemplates = new Set();

    for (const file of files) {
        const extension = path.extname(file);
        if (ESLINT_FILES.has(extension)) {
            const workspace = findWorkspace(file);
            const filesForWorkspace = workspaceFiles.get(workspace) ?? new Set();
            filesForWorkspace.add(file);
            workspaceFiles.set(workspace, filesForWorkspace);
        }
        const isBoundary = pm.isMatch(file, [
            'ghost/core/core/{server,shared,frontend}/**/*.{js,ts}',
            'apps/{shade,admin-x-framework,activitypub,admin-x-settings,portal,comments-ui,signup-form,sodo-search,announcement-bar,admin-toolbar}/src/**/*.{js,ts,tsx,jsx}'
        ]);
        if (isBoundary) {
            boundaries.add(file);
        }

        const isEmberAdminTemplate = pm.isMatch(file, 'apps/ember-admin/**/*.hbs');
        if (isEmberAdminTemplate) {
            emberAdminTemplates.add(file);
        }
    }

    /** @type {string[]} */ const result = [];

    if (files.length) {
        result.push(buildOxfmtCommand(files));
    }

    for (const [workspace, filesForWorkspace] of workspaceFiles.entries()) {
        result.push(buildEslintCommand(workspace, Array.from(filesForWorkspace)));
    }

    if (boundaries.size > 0) {
        result.push(buildBoundaryCommand(Array.from(boundaries)));
    }

    if (emberAdminTemplates.size > 0) {
        result.push(buildEmberTemplateLintCommand(Array.from(emberAdminTemplates)));
    }

    return result;
};
