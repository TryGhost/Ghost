import fs from 'fs';
import path from 'path';
import {describe, expect, it} from 'vitest';

const distDir = path.resolve(__dirname, '../../dist');

describe('Build output', function () {
    it('UMD bundle contains injected CSS', function () {
        const umdPath = path.join(distDir, 'koenig-lexical.umd.js');
        const umdContent = fs.readFileSync(umdPath, 'utf-8');

        // The UMD build should contain the CSS content for style injection
        // so consumers get styles without needing a separate CSS import
        expect(umdContent).toContain('.koenig-lexical');
    });

    it('ES module build has a separate style.css file', function () {
        const cssPath = path.join(distDir, 'style.css');

        expect(fs.existsSync(cssPath)).toBe(true);

        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        expect(cssContent).toContain('.koenig-lexical');
    });
});
