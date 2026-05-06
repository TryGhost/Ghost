const path = require('path');
const fs = require('fs');

const ROOT = process.cwd();

function normalize(p) {
    return p.split(path.sep).join('/');
}

function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
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

const WORKSPACES = new Set(
    loadWorkspacePatterns().flatMap(expandPattern)
);

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

function buildCommand(workspace, files) {
    const base = workspace ? path.join(ROOT, workspace) : ROOT;
    const relativeFiles = files
        .map(file => normalize(path.relative(base, file)))
        .map(shellQuote)
        .join(' ');
    const dirArg = workspace ? `--dir ${shellQuote(workspace)} ` : '';
    return `pnpm ${dirArg}exec eslint --cache -- ${relativeFiles}`;
}

module.exports = {
    '*.{js,ts,tsx,jsx,cjs}': (files) => {
        const groups = new Map();
        for (const file of files) {
            const workspace = findWorkspace(file);
            const key = workspace ?? '';
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(file);
        }
        return [...groups.entries()].map(([workspace, wsFiles]) =>
            buildCommand(workspace || null, wsFiles)
        );
    }
};
