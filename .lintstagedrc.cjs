const path = require('path');

const ESLINT_WORKSPACES = [
    'e2e',
    'apps/admin',
    'apps/activitypub',
    'apps/admin-x-design-system',
    'apps/admin-x-framework',
    'apps/admin-x-settings',
    'apps/comments-ui',
    'apps/posts',
    'apps/portal',
    'apps/shade',
    'apps/signup-form',
    'apps/stats',
    'ghost/admin',
    'ghost/core',
    'ghost/i18n',
    'ghost/parse-email-address'
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

    return `cd ${shellQuote(workspace)} && eslint --cache ${relativeFiles}`;
}

module.exports = {
    '*.{js,ts,tsx,jsx,cjs}': (files) => {
        const workspaceGroups = new Map(ESLINT_WORKSPACES.map(workspace => [workspace, []]));

        for (const file of files) {
            const workspace = ESLINT_WORKSPACES.find(candidate => isInWorkspace(file, candidate));

            if (workspace) {
                workspaceGroups.get(workspace).push(file);
            }
        }

        return [
            ...ESLINT_WORKSPACES
                .map(workspace => buildScopedEslintCommand(workspace, workspaceGroups.get(workspace)))
                .filter(Boolean)
        ].filter(Boolean);
    }
};
