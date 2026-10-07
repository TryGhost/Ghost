import { BasePage } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import {
  coverImagePreview,
  coverImageUpload,
  profileImagePreview,
  profileImageUpload,
  userDetailModal,
} from '@tryghost/test-data/selectors/settings';

type FilePayload = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

export class AdminStaffDetailsPage extends BasePage {
  readonly userDetailModal: Locator;
  readonly emailInput: Locator;
  readonly slugInput: Locator;
  readonly profileImageInput: Locator;
  readonly coverImageInput: Locator;
  readonly profileImagePreview: Locator;
  readonly coverImagePreview: Locator;
  readonly savedButton: Locator;

  constructor(page: Page) {
    super(page, '/ghost/#/settings/staff');

    this.userDetailModal = page.getByTestId(userDetailModal);
    this.emailInput = this.userDetailModal.getByRole('textbox', { name: /Email/i });
    this.slugInput = this.userDetailModal.getByRole('textbox', { name: 'Slug' });
    this.profileImageInput = this.userDetailModal.getByTestId(profileImageUpload);
    this.coverImageInput = this.userDetailModal.getByTestId(coverImageUpload);
    this.profileImagePreview = this.userDetailModal.getByTestId(profileImagePreview);
    this.coverImagePreview = this.userDetailModal.getByTestId(coverImagePreview);
    this.savedButton = this.userDetailModal.getByRole('button', { name: 'Saved' });
  }

  async gotoMyProfile() {
    return await super.goto('/ghost/#/my-profile');
  }

  async uploadProfileImage(image: FilePayload): Promise<void> {
    await this.profileImageInput.setInputFiles(image);
  }

  async uploadCoverImage(image: FilePayload): Promise<void> {
    await this.coverImageInput.setInputFiles(image);
  }

  async save(): Promise<void> {
    await this.userDetailModal.getByRole('button', { name: 'Save' }).click();
  }
}
