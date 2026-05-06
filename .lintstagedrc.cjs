const path = require('path');
const fs = require('fs');

const ROOT = process.cwd();

function normalize(p) {
    return p.split(path.sep).join('/');
}

function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function findWorkspace(file) {
    let dir = path.dirname(path.resolve(file));
    while (dir.startsWith(ROOT) && dir !== ROOT) {
        if (fs.existsSync(path.join(dir, 'package.json'))) {
            return normalize(path.relative(ROOT, dir));
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
    return `pnpm ${dirArg}exec eslint --cache ${relativeFiles}`;
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
