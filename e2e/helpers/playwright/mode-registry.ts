import path from 'path';

export type FileExecutionMode = 'parallel' | 'default' | 'serial';

const fileModeByPath = new Map<string, FileExecutionMode>();
const callerFileByStackLine = new Map<string, string | null>();

const stackLinePattern = /\(?((?:\/|[A-Za-z]:\\)[^():]+?\.(?:[mc]?[jt]s|tsx?)):\d+:\d+\)?$/;
const ignoredStackPathSubstrings = [
    `${path.sep}node_modules${path.sep}`,
    `${path.sep}helpers${path.sep}playwright${path.sep}fixture.`,
    `${path.sep}helpers${path.sep}playwright${path.sep}mode-registry.`
];

function normalizeStackPath(filePath: string): string {
    return path.resolve(filePath.replaceAll('\\', path.sep));
}

function shouldIgnorePath(filePath: string): boolean {
    return ignoredStackPathSubstrings.some((segment) => {
        return filePath.includes(segment);
    });
}

function resolveFilePathFromStackLine(stackLine: string): string | null {
    const cached = callerFileByStackLine.get(stackLine);
    if (cached !== undefined) {
        return cached;
    }

    const match = stackLine.match(stackLinePattern);
    if (!match?.[1]) {
        callerFileByStackLine.set(stackLine, null);
        return null;
    }

    const filePath = normalizeStackPath(match[1]);
    if (shouldIgnorePath(filePath)) {
        callerFileByStackLine.set(stackLine, null);
        return null;
    }

    callerFileByStackLine.set(stackLine, filePath);
    return filePath;
}

export function resolveCallerFilePathFromStack(): string | null {
    const stack = new Error().stack;
    if (!stack) {
        return null;
    }

    for (const line of stack.split('\n').slice(1)) {
        const stackLine = line.trim();
        const filePath = resolveFilePathFromStackLine(stackLine);
        if (filePath) {
            return filePath;
        }
    }

    return null;
}

export function setFileMode(filePath: string, mode: FileExecutionMode): void {
    const existingMode = fileModeByPath.get(filePath);
    if (existingMode && existingMode !== mode) {
        throw new Error(
            `Conflicting root-level mode declarations in ${filePath}: ` +
            `already set to "${existingMode}" but attempted to set "${mode}".`
        );
    }

    fileModeByPath.set(filePath, mode);
}

export function setFileModeFromCaller(mode: FileExecutionMode): string {
    const filePath = resolveCallerFilePathFromStack();
    if (!filePath) {
        throw new Error(
            'Could not resolve caller file for test.describe.configure({mode}). ' +
            'Use root-level configuration in an e2e test file.'
        );
    }

    setFileMode(filePath, mode);
    return filePath;
}

export function getFileMode(filePath: string): FileExecutionMode | undefined {
    return fileModeByPath.get(filePath);
}
