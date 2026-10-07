import {
  settingsFacebookDescriptionInput,
  settingsFacebookPreview,
  settingsFacebookPreviewImage,
  settingsFacebookTitleInput,
  settingsXDescriptionInput,
  settingsXImage,
  settingsXPreview,
  settingsXPreviewImage,
  settingsXTitleInput,
} from '@tryghost/test-data/selectors/editor';
import type { BrandIconName } from '@/shared/brand-icon/brand-icon';
import type { SettingsSectionId } from './sections';
import type { SettingsTextFieldKey } from './use-settings-field';

/** A line of the card preview. Each network stacks the three in its own order. */
export type SocialPreviewRow = 'description' | 'domain' | 'title';

export interface SocialCardNetwork {
  /** The settings section the pane is opened under. */
  id: Extract<SettingsSectionId, 'facebook-card' | 'x-card'>;
  /** The network's name. Every label in the pane reads `<name> …`. */
  name: string;
  icon: BrandIconName;
  titleKey: SettingsTextFieldKey;
  descriptionKey: SettingsTextFieldKey;
  imageKey: 'og_image' | 'twitter_image';
  /** The site's own image for this network, which the card falls back to. */
  siteImageKey: 'siteOgImage' | 'siteTwitterImage';
  titleTestId: string;
  descriptionTestId: string;
  previewTestId: string;
  previewImageTestId: string;
  imageTestId?: string;
  previewRows: readonly SocialPreviewRow[];
  /** X shows the preview title whole; Facebook truncates it like the description. */
  truncatesPreviewTitle: boolean;
}

export const X_CARD_NETWORK: SocialCardNetwork = {
  id: 'x-card',
  name: 'X',
  icon: 'twitter-x',
  titleKey: 'twitter_title',
  descriptionKey: 'twitter_description',
  imageKey: 'twitter_image',
  siteImageKey: 'siteTwitterImage',
  titleTestId: settingsXTitleInput,
  descriptionTestId: settingsXDescriptionInput,
  previewTestId: settingsXPreview,
  previewImageTestId: settingsXPreviewImage,
  imageTestId: settingsXImage,
  previewRows: ['title', 'description', 'domain'],
  truncatesPreviewTitle: false,
};

export const FACEBOOK_CARD_NETWORK: SocialCardNetwork = {
  id: 'facebook-card',
  name: 'Facebook',
  icon: 'facebook',
  titleKey: 'og_title',
  descriptionKey: 'og_description',
  imageKey: 'og_image',
  siteImageKey: 'siteOgImage',
  titleTestId: settingsFacebookTitleInput,
  descriptionTestId: settingsFacebookDescriptionInput,
  previewTestId: settingsFacebookPreview,
  previewImageTestId: settingsFacebookPreviewImage,
  previewRows: ['domain', 'title', 'description'],
  truncatesPreviewTitle: true,
};
