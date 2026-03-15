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

            const unsplashPhoto = page.locator('[data-kg-unsplash-gallery-img]');
            await expect(unsplashPhoto.first()).toBeVisible({timeout: 10000});
        });
    });
});
