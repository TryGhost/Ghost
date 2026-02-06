import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class DesignSection extends BasePage {
    readonly section: Locator;
    readonly customizeButton: Locator;
    readonly designModal: Locator;
    readonly unsplashButton: Locator;
    readonly unsplashHeading: Locator;
    readonly coverImage: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('design');
        this.customizeButton = this.section.getByRole('button', {name: 'Customize'});
        this.designModal = page.getByTestId('design-modal');
        this.unsplashButton = page.getByTestId('toggle-unsplash-button');
        this.unsplashHeading = page.getByRole('heading', {name: 'Unsplash', level: 1});
        this.coverImage = page.getByTestId('publication-cover');
    }

    async openDesignModal(): Promise<void> {
        await this.customizeButton.click();
        await this.designModal.waitFor({state: 'visible'});
    }

    async deleteCoverImage(): Promise<void> {
        const imageContainer = this.coverImage.getByTestId('image-upload-container');
        await imageContainer.hover();
        await imageContainer.getByTestId('image-delete-button').click();
    }

    async openUnsplashSelector(): Promise<void> {
        await this.unsplashButton.click();
        await this.unsplashHeading.waitFor({state: 'visible'});
    }
}
