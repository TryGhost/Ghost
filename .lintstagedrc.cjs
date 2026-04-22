const path = require('path');

const SCOPED_WORKSPACES = [
    'e2e',
    'apps/admin',
    'apps/posts',
    'apps/shade'
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

    return `pnpm --dir ${shellQuote(workspace)} exec eslint --cache ${relativeFiles}`;
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
        const workspaceGroups = new Map(SCOPED_WORKSPACES.map(workspace => [workspace, []]));
        const rootFiles = [];

        for (const file of files) {
            const workspace = SCOPED_WORKSPACES.find(candidate => isInWorkspace(file, candidate));

            if (workspace) {
                workspaceGroups.get(workspace).push(file);
            } else {
                rootFiles.push(file);
            }
        }

        return [
            ...SCOPED_WORKSPACES
                .map(workspace => buildScopedEslintCommand(workspace, workspaceGroups.get(workspace)))
                .filter(Boolean),
            buildRootEslintCommand(rootFiles)
        ].filter(Boolean);
    }
};
