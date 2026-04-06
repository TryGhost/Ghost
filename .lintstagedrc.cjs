const path = require('path');

const FLAT_CONFIG_WORKSPACES = [
    'e2e',
    'apps/admin'
];

// Workspaces that use legacy eslintrc but need extra flags (e.g. --rulesdir)
const LEGACY_SCOPED_WORKSPACES = [
    {path: 'apps/comments-ui', extraFlags: ['--rulesdir', path.join(__dirname, 'ghost/i18n/eslint-rules')]}
];

function normalize(file) {
    return file.split(path.sep).join('/');
}

function isInWorkspace(file, workspace) {
    const normalizedFile = normalize(path.relative(process.cwd(), file));
    const normalizedWorkspace = normalize(workspace);

    return normalizedFile === normalizedWorkspace || normalizedFile.startsWith(`${normalizedWorkspace}/`);
}

function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildScopedEslintCommand(workspace, files) {
    if (files.length === 0) {
        return null;
    }

    const relativeFiles = files
        .map(file => normalize(path.relative(workspace, file)))
        .map(shellQuote)
        .join(' ');

    return `yarn --cwd ${shellQuote(workspace)} eslint --cache ${relativeFiles}`;
}

function buildLegacyScopedEslintCommand(workspace, files) {
    if (files.length === 0) {
        return null;
    }

    const quotedFiles = files.map(file => shellQuote(normalize(file))).join(' ');
    const flags = workspace.extraFlags.map(shellQuote).join(' ');
    return `eslint --cache ${flags} ${quotedFiles}`;
}

function buildRootEslintCommand(files) {
    if (files.length === 0) {
        return null;
    }

    const quotedFiles = files.map(file => shellQuote(normalize(file))).join(' ');
    return `eslint --cache ${quotedFiles}`;
}

module.exports = {
    '*.{js,ts,tsx,jsx,cjs}': (files) => {
        const workspaceGroups = new Map(FLAT_CONFIG_WORKSPACES.map(workspace => [workspace, []]));
        const legacyGroups = new Map(LEGACY_SCOPED_WORKSPACES.map(ws => [ws.path, []]));
        const rootFiles = [];

        for (const file of files) {
            const flatWorkspace = FLAT_CONFIG_WORKSPACES.find(candidate => isInWorkspace(file, candidate));
            const legacyWorkspace = LEGACY_SCOPED_WORKSPACES.find(ws => isInWorkspace(file, ws.path));

            if (flatWorkspace) {
                workspaceGroups.get(flatWorkspace).push(file);
            } else if (legacyWorkspace) {
                legacyGroups.get(legacyWorkspace.path).push(file);
            } else {
                rootFiles.push(file);
            }
        }

        return [
            ...FLAT_CONFIG_WORKSPACES
                .map(workspace => buildScopedEslintCommand(workspace, workspaceGroups.get(workspace)))
                .filter(Boolean),
            ...LEGACY_SCOPED_WORKSPACES
                .map(ws => buildLegacyScopedEslintCommand(ws, legacyGroups.get(ws.path)))
                .filter(Boolean),
            buildRootEslintCommand(rootFiles)
        ].filter(Boolean);
    }
};
