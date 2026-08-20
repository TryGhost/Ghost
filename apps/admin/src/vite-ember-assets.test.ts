import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {copyDirectorySkippingSelfReferences} from '../vite-ember-assets';

describe('copyDirectorySkippingSelfReferences', () => {
    const temporaryDirectories: string[] = [];

    afterEach(() => {
        temporaryDirectories.splice(0).forEach(directory => fs.rmSync(directory, {recursive: true, force: true}));
    });

    it('copies ordinary assets without copying a symlink back onto the same real directory', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-admin-assets-'));
        temporaryDirectories.push(root);
        const shared = path.join(root, 'activitypub-dist');
        const source = path.join(root, 'react-assets');
        const destination = path.join(root, 'ghost-assets');
        fs.mkdirSync(shared);
        fs.mkdirSync(source);
        fs.mkdirSync(destination);
        fs.writeFileSync(path.join(shared, 'activitypub.js'), 'activitypub');
        fs.writeFileSync(path.join(source, 'admin.js'), 'admin');
        fs.symlinkSync(shared, path.join(source, 'activitypub'));
        fs.symlinkSync(shared, path.join(destination, 'activitypub'));

        copyDirectorySkippingSelfReferences(source, destination);

        expect(fs.readFileSync(path.join(destination, 'admin.js'), 'utf8')).toBe('admin');
        expect(fs.readFileSync(path.join(destination, 'activitypub', 'activitypub.js'), 'utf8')).toBe('activitypub');
    });
});
