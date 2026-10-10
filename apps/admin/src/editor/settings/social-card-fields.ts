import { seoTitle } from './meta-data-fields';

/** The lengths a card pane truncates to: the two placeholders, then the preview. */
export const SOCIAL_TITLE_PLACEHOLDER_LENGTH = 40;
export const SOCIAL_DESCRIPTION_PLACEHOLDER_LENGTH = 150;
export const SOCIAL_PREVIEW_LENGTH = 140;

export interface SocialTitleSources {
  /** The card's own title, which the pane edits. */
  own: string;
  metaTitle: string;
  title: string;
}

export interface SocialDescriptionSources {
  /** The card's own description, which the pane edits. */
  own: string;
  customExcerpt: string;
  metaDescription: string;
  /** The excerpt the post was read with, generated from its body where it has no custom one. */
  postExcerpt: string;
  siteDescription: string;
}

export interface SocialImageSources {
  /** The card's own image, which the pane edits. */
  own: string;
  featureImage: string;
  /** The site's image for this network. */
  siteSocialImage: string;
  siteCoverImage: string;
}

/** The card's title, else the post's search title. */
export function socialTitle({ own, metaTitle, title }: SocialTitleSources): string {
  return own || seoTitle(metaTitle, title);
}

/**
 * The card's description, else the post's excerpt, its search description, the
 * excerpt the server generated, and finally the site's own description.
 */
export function socialDescription({
  own,
  customExcerpt,
  metaDescription,
  postExcerpt,
  siteDescription,
}: SocialDescriptionSources): string {
  return own || customExcerpt || metaDescription || postExcerpt || siteDescription || '';
}

/** The card's image, else the feature image and the site's own images. */
export function socialImage({
  own,
  featureImage,
  siteSocialImage,
  siteCoverImage,
}: SocialImageSources): string {
  return own || featureImage || siteSocialImage || siteCoverImage || '';
}

/** The site's address as a card shows it: no scheme, no trailing slash. */
export function siteDomain(siteUrl: string): string {
  return siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
