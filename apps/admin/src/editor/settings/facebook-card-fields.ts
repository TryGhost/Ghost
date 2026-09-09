import { seoTitle, truncate } from './meta-data-fields';

/** The lengths the pane truncates to: the two placeholders, then the preview. */
export const FACEBOOK_TITLE_PLACEHOLDER_LENGTH = 40;
export const FACEBOOK_DESCRIPTION_PLACEHOLDER_LENGTH = 150;
export const FACEBOOK_PREVIEW_LENGTH = 140;

export interface FacebookTitleSources {
  ogTitle: string;
  metaTitle: string;
  title: string;
}

export interface FacebookDescriptionSources {
  ogDescription: string;
  customExcerpt: string;
  metaDescription: string;
  /** The excerpt the post was read with, generated from its body where it has no custom one. */
  postExcerpt: string;
  siteDescription: string;
}

export interface FacebookImageSources {
  ogImage: string;
  featureImage: string;
  siteOgImage: string;
  siteCoverImage: string;
}

/** The Facebook title, else the post's search title. */
export function facebookTitle({ ogTitle, metaTitle, title }: FacebookTitleSources): string {
  return ogTitle || seoTitle(metaTitle, title);
}

/**
 * The Facebook description, else the post's excerpt, its search description,
 * the excerpt the server generated, and finally the site's own description.
 */
export function facebookDescription({
  ogDescription,
  customExcerpt,
  metaDescription,
  postExcerpt,
  siteDescription,
}: FacebookDescriptionSources): string {
  return ogDescription || customExcerpt || metaDescription || postExcerpt || siteDescription || '';
}

/** The Facebook image, else the feature image and the site's own images. */
export function facebookImage({
  ogImage,
  featureImage,
  siteOgImage,
  siteCoverImage,
}: FacebookImageSources): string {
  return ogImage || featureImage || siteOgImage || siteCoverImage || '';
}

/** The site's address as the card shows it: no scheme, no trailing slash. */
export function siteDomain(siteUrl: string): string {
  return siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function facebookTitlePlaceholder(title: string): string {
  return truncate(title, FACEBOOK_TITLE_PLACEHOLDER_LENGTH);
}

export function facebookDescriptionPlaceholder(description: string): string {
  return truncate(description, FACEBOOK_DESCRIPTION_PLACEHOLDER_LENGTH);
}

export function facebookPreviewText(value: string): string {
  return truncate(value, FACEBOOK_PREVIEW_LENGTH);
}
