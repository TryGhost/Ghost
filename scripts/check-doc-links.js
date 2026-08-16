import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const EXCLUDED_PATHS = [
    /^\.changeset\//,
    /(^|\/)fixtures?\//
];

function trackedMarkdownFiles(rootDirectory) {
    const output = execFileSync('git', ['ls-files', '-z', '*.md'], {
        cwd: rootDirectory,
        encoding: 'utf8'
    });

    return output.split('\0').filter(Boolean).filter(file => !EXCLUDED_PATHS.some(pattern => pattern.test(file)));
}

function maskCode(markdown, {inline = true} = {}) {
    let fence;

    return markdown.split('\n').map((line) => {
        const match = line.match(/^\s{0,3}(`{3,}|~{3,})/);

        if (match) {
            const marker = match[1][0];
            const length = match[1].length;

            if (!fence) {
                fence = {marker, length};
            } else if (fence.marker === marker && length >= fence.length) {
                fence = undefined;
            }

            return '';
        }

        if (fence) {
            return '';
        }

        return inline ? line.replace(/(`+)[^`]*\1/g, '') : line;
    }).join('\n');
}

function lineNumberAt(content, index) {
    return content.slice(0, index).split('\n').length;
}

export function findLocalLinks(markdown) {
    const content = maskCode(markdown);
    const links = [];
    const patterns = [
        /!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g,
        /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm,
        /<(?:a|img)\b[^>]*?\s(?:href|src)=["']([^"']+)["'][^>]*>/gi
    ];

    for (const pattern of patterns) {
        for (const match of content.matchAll(pattern)) {
            const target = match.slice(1).find(Boolean);

            if (!target || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) {
                continue;
            }

            links.push({target, line: lineNumberAt(content, match.index)});
        }
    }

    return links;
}

function githubSlug(heading) {
    return heading
        .trim()
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[`*_~]/g, '')
        .replace(/[^\p{Letter}\p{Number}\p{Emoji_Presentation}\s-]/gu, '')
        .replace(/\s/g, '-');
}

export function markdownAnchors(markdown) {
    const content = maskCode(markdown, {inline: false});
    const anchors = new Set();
    const duplicates = new Map();

    for (const match of content.matchAll(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
        const base = githubSlug(match[1]);
        const duplicate = duplicates.get(base) ?? 0;
        const slug = duplicate === 0 ? base : `${base}-${duplicate}`;
        duplicates.set(base, duplicate + 1);
        anchors.add(slug);
    }

    return anchors;
}

function decodeTarget(target) {
    try {
        return decodeURIComponent(target);
    } catch {
        return target;
    }
}

export async function checkDocLinks(rootDirectory, files = trackedMarkdownFiles(rootDirectory)) {
    const errors = [];
    const trackedFiles = new Set(execFileSync('git', ['ls-files', '-z'], {
        cwd: rootDirectory,
        encoding: 'utf8'
    }).split('\0').filter(Boolean));
    const anchorsByFile = new Map();

    for (const sourceFile of files) {
        const markdown = await readFile(path.join(rootDirectory, sourceFile), 'utf8');

        for (const {target: rawTarget, line} of findLocalLinks(markdown)) {
            const [rawPath, rawAnchor] = rawTarget.split('#', 2);
            const targetPath = decodeTarget(rawPath).split('?')[0];
            const anchor = rawAnchor ? decodeTarget(rawAnchor).toLowerCase() : '';
            const resolved = targetPath.startsWith('/')
                ? path.resolve(rootDirectory, `.${targetPath}`)
                : path.resolve(rootDirectory, path.dirname(sourceFile), targetPath || path.basename(sourceFile));
            const relativeTarget = path.relative(rootDirectory, resolved).split(path.sep).join('/');

            if (relativeTarget.startsWith('../') || path.isAbsolute(relativeTarget)) {
                errors.push(`${sourceFile}:${line}: link escapes the repository: ${rawTarget}`);
                continue;
            }

            const isTrackedFile = trackedFiles.has(relativeTarget);
            const isTrackedDirectory = [...trackedFiles].some(file => file.startsWith(`${relativeTarget}/`));

            if (!isTrackedFile && !isTrackedDirectory) {
                errors.push(`${sourceFile}:${line}: target does not exist: ${rawTarget}`);
                continue;
            }

            if (anchor && isTrackedFile && relativeTarget.endsWith('.md')) {
                if (!anchorsByFile.has(relativeTarget)) {
                    anchorsByFile.set(relativeTarget, markdownAnchors(await readFile(resolved, 'utf8')));
                }

                if (!anchorsByFile.get(relativeTarget).has(anchor)) {
                    errors.push(`${sourceFile}:${line}: heading does not exist: ${rawTarget}`);
                }
            }
        }
    }

    return errors;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
    const errors = await checkDocLinks(process.cwd());

    if (errors.length > 0) {
        console.error(`Documentation link check failed:\n\n${errors.join('\n')}`);
        process.exitCode = 1;
    } else {
        console.log('All repository-relative documentation links resolve.');
    }
}
