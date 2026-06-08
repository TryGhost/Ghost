import {DesignSection} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Design & Branding', () => {
    test.describe('Unsplash Selector', () => {
        test('unsplash selector loads photos', async ({page}) => {
            const design = new DesignSection(page);

            await design.goto();
            await design.openDesignModal();
            await design.deleteCoverImage();
            await design.openUnsplashSelector();

            await expect(design.unsplashPhotos.first()).toBeVisible({timeout: 10000});
        });
    });
});
