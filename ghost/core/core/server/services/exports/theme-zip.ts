import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import security from '@tryghost/security';
import {compress} from '@tryghost/zip';
import config from '../../../shared/config';

/**
 * Zips a single installed theme into a Buffer — the same artifact the theme
 * download endpoint serves, so a theme pulled out of a site export restores
 * through the regular theme upload UI.
 *
 * Themes are small (a few MB at most), so buffering keeps the zip's lifecycle
 * simple: the temp file is gone before the caller sees the result.
 */
export async function zipThemeToBuffer(themeName: string): Promise<Buffer> {
    const themePath = path.join(config.getContentPath('themes'), themeName);
    const tmpDir = path.join(os.tmpdir(), `ghost-export-${security.identifier.uid(10)}`);

    await fs.ensureDir(tmpDir);

    try {
        const zipPath = path.join(tmpDir, `${themeName}.zip`);
        await compress(themePath, zipPath);
        return await fs.readFile(zipPath);
    } finally {
        await fs.remove(tmpDir);
    }
}
