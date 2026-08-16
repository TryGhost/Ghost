import {afterEach, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {checkDocLinks, findLocalLinks, markdownAnchors} from '../check-doc-links.js';

const temporaryDirectories = [];

afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, {recursive: true, force: true})));
});

async function temporaryRepository(files) {
    const directory = await mkdtemp(path.join(tmpdir(), 'ghost-doc-links-'));
    temporaryDirectories.push(directory);
    execFileSync('git', ['init', '--quiet'], {cwd: directory});

    for (const [file, content] of Object.entries(files)) {
        await mkdir(path.dirname(path.join(directory, file)), {recursive: true});
        await writeFile(path.join(directory, file), content);
    }

    execFileSync('git', ['add', '.'], {cwd: directory});
    return directory;
}

describe('findLocalLinks', () => {
    it('finds inline, reference, image, and HTML links', () => {
        const markdown = [
            '[Guide](docs/guide.md#setup)',
            '![Diagram](images/diagram.png)',
            '[Reference][guide]',
            '[guide]: <docs/guide.md>',
            '<a href="docs/other.md">Other</a>'
        ].join('\n');

        assert.deepEqual(findLocalLinks(markdown), [
            {target: 'docs/guide.md#setup', line: 1},
            {target: 'images/diagram.png', line: 2},
            {target: 'docs/guide.md', line: 4},
            {target: 'docs/other.md', line: 5}
        ]);
    });

    it('ignores external links and links in code', () => {
        const markdown = [
            '[Ghost](https://ghost.org)',
            '`[inline](missing.md)`',
            '```md',
            '[example](missing.md)',
            '```'
        ].join('\n');

        assert.deepEqual(findLocalLinks(markdown), []);
    });
});

describe('markdownAnchors', () => {
    it('matches GitHub-style heading anchors and duplicate suffixes', () => {
        const markdown = [
            '# Development setup',
            '## Run `pnpm dev`',
            '## Development setup'
        ].join('\n');

        assert.deepEqual([...markdownAnchors(markdown)], [
            'development-setup',
            'run-pnpm-dev',
            'development-setup-1'
        ]);
    });
});

describe('checkDocLinks', () => {
    it('accepts existing files and headings', async () => {
        const root = await temporaryRepository({
            'README.md': '[Setup](docs/guide.md#development-setup)',
            'docs/guide.md': '# Development setup'
        });

        assert.deepEqual(await checkDocLinks(root), []);
    });

    it('reports missing files and headings with their source lines', async () => {
        const root = await temporaryRepository({
            'README.md': '[Missing](missing.md)\n\n[Wrong heading](guide.md#missing)',
            'guide.md': '# Present'
        });

        assert.deepEqual(await checkDocLinks(root), [
            'README.md:1: target does not exist: missing.md',
            'README.md:3: heading does not exist: guide.md#missing'
        ]);
    });
});
