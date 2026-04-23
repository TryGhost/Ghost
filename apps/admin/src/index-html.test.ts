import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import htmlContent from '../index.html?raw';

const headContent = htmlContent.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const appleTouchIconHref = headContent
    .match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"/)?.[1] ?? null;

describe('apps/admin/index.html apple-touch-icon', () => {
    it('link tag exists inside <head>', () => {
        expect(headContent).toContain('<link rel="apple-touch-icon"');
    });

    it('href is a relative path (absolute paths break subdirectory installs)', () => {
        expect(appleTouchIconHref).not.toBeNull();
        const filePath = appleTouchIconHref!.split('?')[0];
        expect(filePath).not.toMatch(/^\//);
        expect(filePath).toContain('apple-touch-icon.png');
    });

    it('image file exists in public/ so Vite includes it in the build', () => {
        expect(appleTouchIconHref).not.toBeNull();
        const filePath = appleTouchIconHref!.split('?')[0];
        const absolutePath = path.resolve(__dirname, '../public', filePath);
        expect(fs.existsSync(absolutePath), `Missing: ${absolutePath}`).toBe(true);
    });
});
