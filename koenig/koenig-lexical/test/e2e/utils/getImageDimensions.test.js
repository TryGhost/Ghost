import {afterAll, beforeAll, beforeEach, describe, test, expect} from 'vitest';
import {startApp, initialize, focusEditor} from '../../utils/e2e';
import {getImageDimensions} from '../../../src/utils/getImageDimensions'; 
import path from 'path';

describe('Image card', async () => {
    let app;
    let page;

    beforeAll(async () => {
        ({app, page} = await startApp());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    test('can get image height and width', async function () {
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');

        await focusEditor(page);
        await page.keyboard.type('image! ');

        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            await page.click('button[name="placeholder-button"]')
        ]);
        await fileChooser.setFiles([filePath]);

        const imageCard = await page.$('[data-kg-card="image"]');
        expect(imageCard).not.toBeNull();

        const image = await page.$('img');
        expect(image).not.toBeNull();

        const url = await page.evaluate((imageData) => {
            return imageData.src;
        }, image);

        const getImageDimensionsStr = getImageDimensions.toString();
        const command = `(${getImageDimensionsStr})('${url}')`;
        const dimensions = await page.evaluate(command);

        expect(dimensions).toEqual({width: 248, height: 248});
    });
});
