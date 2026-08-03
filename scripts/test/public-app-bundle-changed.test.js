import {describe, it, before, after} from 'node:test';
import assert from 'node:assert';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {hashBundle, maskVersion} from '../public-app-bundle-changed.js';

describe('maskVersion', () => {
    it('replaces every occurrence of the version', () => {
        const masked = maskVersion(Buffer.from('a@1.2.3|b@1.2.3'), '1.2.3').toString('latin1');

        assert.ok(!masked.includes('1.2.3'));
        assert.strictEqual(masked.split('\0version\0').length - 1, 2);
    });

    it('leaves other content byte-identical', () => {
        const contents = Buffer.from([0x00, 0xff, 0x7f, 0x80, 0x41]);

        assert.deepStrictEqual(maskVersion(contents, '9.9.9'), contents);
    });
});

describe('hashBundle', () => {
    let dir;

    const bundle = (name, files) => {
        const root = join(dir, name);
        mkdirSync(join(root, 'nested'), {recursive: true});
        for (const [file, contents] of Object.entries(files)) {
            writeFileSync(join(root, file), contents);
        }
        return root;
    };

    before(() => {
        dir = mkdtempSync(join(tmpdir(), 'hash-bundle-test-'));
    });

    after(() => {
        rmSync(dir, {recursive: true, force: true});
    });

    it('matches for identical trees', () => {
        const files = {'app.js': 'console.log(1)', 'app.css': 'a{}', 'nested/deep.js': 'x'};

        assert.strictEqual(hashBundle(bundle('a', files), '1.0.0'), hashBundle(bundle('b', files), '1.0.0'));
    });

    it('matches when only the baked-in version differs', () => {
        const a = bundle('version-a', {'app.js': 'const r="portal@2.69.16|ghost@x"'});
        const b = bundle('version-b', {'app.js': 'const r="portal@2.69.222|ghost@x"'});

        assert.strictEqual(hashBundle(a, '2.69.16'), hashBundle(b, '2.69.222'));
    });

    it('differs when the bundle content differs', () => {
        const a = bundle('content-a', {'app.js': 'console.log(1)'});
        const b = bundle('content-b', {'app.js': 'console.log(2)'});

        assert.notStrictEqual(hashBundle(a, '1.0.0'), hashBundle(b, '1.0.0'));
    });

    it('differs when a file is renamed', () => {
        const a = bundle('name-a', {'app.js': 'same'});
        const b = bundle('name-b', {'other.js': 'same'});

        assert.notStrictEqual(hashBundle(a, '1.0.0'), hashBundle(b, '1.0.0'));
    });

    it('ignores sourcemaps, whose mappings shift with the masked version', () => {
        const a = bundle('map-a', {'app.js': 'same', 'app.js.map': '{"mappings":"AAAA"}'});
        const b = bundle('map-b', {'app.js': 'same', 'app.js.map': '{"mappings":"CCCC"}'});

        assert.strictEqual(hashBundle(a, '1.0.0'), hashBundle(b, '1.0.0'));
    });
});
