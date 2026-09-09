import { seoTitle, truncate } from './meta-data-fields';

/** The lengths the pane truncates to: the two placeholders, then the preview. */
const X_TITLE_PLACEHOLDER_LENGTH = 40;
const X_DESCRIPTION_PLACEHOLDER_LENGTH = 150;
const X_PREVIEW_DESCRIPTION_LENGTH = 140;

export interface XTitleSources {
  twitterTitle: string;
  metaTitle: string;
  title: string;
}

export interface XDescriptionSources {
  twitterDescription: string;
  customExcerpt: string;
  metaDescription: string;
  /** The excerpt the post was read with, generated from its body where it has no custom one. */
  postExcerpt: string;
  siteDescription: string;
}

export interface XImageSources {
  twitterImage: string;
  featureImage: string;
  siteTwitterImage: string;
  siteCoverImage: string;
}

/** The X title, else the search result's title. */
export function xCardTitle({ twitterTitle, metaTitle, title }: XTitleSources): string {
  return twitterTitle || seoTitle(metaTitle, title);
}

/**
 * The X description, else the post's excerpt, its search description, the
 * excerpt the server generated, and finally the site's own description.
 */
export function xCardDescription({
  twitterDescription,
  customExcerpt,
  metaDescription,
  postExcerpt,
  siteDescription,
}: XDescriptionSources): string {
  return (
    twitterDescription || customExcerpt || metaDescription || postExcerpt || siteDescription || ''
  );
}

/** The X image, else the feature image and the site's own images. */
export function xCardImage({
  twitterImage,
  featureImage,
  siteTwitterImage,
  siteCoverImage,
}: XImageSources): string {
  return twitterImage || featureImage || siteTwitterImage || siteCoverImage || '';
}

export function xTitlePlaceholder(value: string): string {
  return truncate(value, X_TITLE_PLACEHOLDER_LENGTH);
}

export function xDescriptionPlaceholder(value: string): string {
  return truncate(value, X_DESCRIPTION_PLACEHOLDER_LENGTH);
}

/** The card truncates the description it shows; the title it shows in full. */
export function xPreviewDescription(value: string): string {
  return truncate(value, X_PREVIEW_DESCRIPTION_LENGTH);
}
