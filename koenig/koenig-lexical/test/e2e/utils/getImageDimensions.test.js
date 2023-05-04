import path from 'path';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
import {focusEditor, initialize} from '../../utils/e2e';
import {getImageDimensions} from '../../../src/utils/getImageDimensions';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Image card', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('can get image height and width', async function ({page}) {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        const imageCard = await page.locator('[data-kg-card="image"]');
        expect(imageCard).not.toBeNull();

        const image = await page.locator('img');
        expect(image).not.toBeNull();

        const url = await image.getAttribute('src');

        const getImageDimensionsStr = getImageDimensions.toString();
        const command = `(${getImageDimensionsStr})('${url}')`;
        const dimensions = await page.evaluate(command);

        expect(dimensions).toEqual({width: 248, height: 248});
    });
});
