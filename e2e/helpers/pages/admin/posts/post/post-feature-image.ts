import { Locator, Page } from '@playwright/test';
import {
  addFeatureImageLabel,
  editorFeatureImage,
  editorFeatureImageCaption,
  featureImageAltLabel,
  featureImageTkIndicator,
  featureImageUnsplashButton,
  removeFeatureImageButton,
  toggleFeatureImageAltButton,
  unsplashInsertImageButton,
  unsplashSearchHeading,
  unsplashSearchModal,
} from '@tryghost/test-data/selectors/editor';

/** The React editor's feature image, above the title. */
export class FeatureImage {
  readonly root: Locator;
  readonly fileInput: Locator;
  readonly unsplashButton: Locator;
  /** The Unsplash search, wherever the picker that opened it sits. */
  readonly unsplashSearch: Locator;
  /** The search's heading: its wrapper has no box of its own, so this is what shows it open. */
  readonly unsplashHeading: Locator;
  readonly removeButton: Locator;
  readonly altToggle: Locator;
  readonly altInput: Locator;
  /** The caption's Koenig content editable. */
  readonly caption: Locator;
  readonly tkIndicator: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId(editorFeatureImage);
    this.fileInput = this.root.getByLabel(addFeatureImageLabel, { exact: true });
    this.unsplashButton = this.root.getByRole('button', {
      name: featureImageUnsplashButton,
      exact: true,
    });
    this.unsplashSearch = page.getByTestId(unsplashSearchModal);
    this.unsplashHeading = this.unsplashSearch.getByRole('heading', {
      name: unsplashSearchHeading,
      exact: true,
    });
    this.removeButton = this.root.getByRole('button', {
      name: removeFeatureImageButton,
      exact: true,
    });
    this.altToggle = this.root.getByRole('button', {
      name: toggleFeatureImageAltButton,
      exact: true,
    });
    this.altInput = this.root.getByLabel(featureImageAltLabel, { exact: true });
    this.caption = this.root.getByTestId(editorFeatureImageCaption).getByRole('textbox');
    this.tkIndicator = this.root.getByTestId(featureImageTkIndicator);
  }

  async upload(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
  }

  async openUnsplash(): Promise<void> {
    await this.unsplashButton.click();
    await this.unsplashHeading.waitFor({ state: 'visible' });
  }

  /**
   * Inserts the open search's photo whose alt text is `alt`. The tile's hover
   * overlay covers the image and its insert control is not scoped per tile, so
   * this expects a gallery holding that photo alone; the search closes on insert.
   */
  async insertUnsplashPhoto(alt: string): Promise<void> {
    await this.unsplashSearch
      .getByRole('img', { name: alt, exact: true })
      .waitFor({ state: 'visible' });
    await this.unsplashSearch.getByText(unsplashInsertImageButton, { exact: true }).click();
    await this.unsplashHeading.waitFor({ state: 'hidden' });
  }

  async remove(): Promise<void> {
    await this.removeButton.click();
  }

  /** The alt input shares the caption's place; the toggle swaps between them. */
  async setAlt(alt: string): Promise<void> {
    if (!(await this.altInput.isVisible())) {
      await this.altToggle.click();
    }
    await this.altInput.fill(alt);
    await this.altInput.blur();
  }
}
