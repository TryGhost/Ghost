import fs from 'fs';
import path from 'path';
import {describe, expect, it} from 'vitest';

const distDir = path.resolve(__dirname, '../../dist');

describe('Build output', function () {
    it('ES module build has a separate style.css file', function () {
        const cssPath = path.join(distDir, 'style.css');

        expect(fs.existsSync(cssPath)).toBe(true);

        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        expect(cssContent).toContain('.koenig-lexical');
    });
});
