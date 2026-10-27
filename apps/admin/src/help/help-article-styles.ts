import { cn } from '@tryghost/shade/utils';

/*
 * How a help center article's HTML is styled in Admin, shared by the article
 * view (help-article-view.tsx) and the results' preview (help-results.tsx).
 */

// Ghost's article HTML, styled with Admin's tokens: paragraphs and headings,
// lists, code, images with captions, and callout cards. The results' preview
// (help-results.tsx) uses it too.
export const ARTICLE_CONTENT_CLASS_NAME = cn(
  'text-md leading-relaxed text-text-primary',
  '[&_p]:my-3 [&_strong]:font-semibold',
  '[&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold',
  '[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:font-semibold',
  '[&_a]:underline [&_a]:underline-offset-2',
  '[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm',
  '[&_figure]:my-5 [&_img]:h-auto [&_img]:max-w-full [&_img]:cursor-zoom-in [&_img]:rounded-lg [&_img]:border [&_img]:border-border-default',
  '[&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-text-secondary',
  '[&_.kg-callout-card]:my-4 [&_.kg-callout-card]:flex [&_.kg-callout-card]:gap-3 [&_.kg-callout-card]:rounded-lg [&_.kg-callout-card]:bg-muted [&_.kg-callout-card]:p-4',
  '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border-default [&_blockquote]:pl-4 [&_blockquote]:text-text-secondary',
  '[&_hr]:my-6 [&_hr]:border-border-default',
  '[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:font-semibold',
  // Code blocks and tables scroll sideways rather than widen the panel
  '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_table]:my-4 [&_table]:block [&_table]:overflow-x-auto [&_table]:text-sm',
  '[&_td]:border-b [&_td]:border-border-default [&_td]:px-2 [&_td]:py-1.5 [&_th]:border-b [&_th]:border-border-default [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold',
  // Toggle cards, rebuilt as disclosures (help-article-html.ts)
  '[&_details]:my-3 [&_details]:rounded-lg [&_details]:border [&_details]:border-border-default [&_details]:px-4 [&_details]:py-3',
  '[&_details[open]>summary]:mb-1 [&_summary]:cursor-pointer [&_summary]:font-semibold',
  '[&_audio]:my-4 [&_audio]:w-full [&_video]:w-full [&_video]:rounded-lg',
  '[&_.kg-gallery-image]:min-w-0 [&_.kg-gallery-image]:flex-1 [&_.kg-gallery-row]:flex [&_.kg-gallery-row]:gap-2 [&_.kg-gallery-row+.kg-gallery-row]:mt-2',
  // Bookmark cards: a compact link, without the thumbnail, too wide for the panel
  '[&_.kg-bookmark-container]:my-4 [&_.kg-bookmark-container]:block [&_.kg-bookmark-container]:rounded-lg [&_.kg-bookmark-container]:border [&_.kg-bookmark-container]:border-border-default [&_.kg-bookmark-container]:p-3 [&_.kg-bookmark-container]:no-underline',
  '[&_.kg-bookmark-title]:text-sm [&_.kg-bookmark-title]:font-semibold',
  '[&_.kg-bookmark-description]:mt-1 [&_.kg-bookmark-description]:line-clamp-2 [&_.kg-bookmark-description]:text-sm [&_.kg-bookmark-description]:text-text-secondary',
  '[&_.kg-bookmark-metadata]:mt-2 [&_.kg-bookmark-metadata]:flex [&_.kg-bookmark-metadata]:items-center [&_.kg-bookmark-metadata]:gap-1.5 [&_.kg-bookmark-metadata]:text-xs [&_.kg-bookmark-metadata]:text-text-tertiary',
  '[&_.kg-bookmark-icon]:size-4 [&_.kg-bookmark-icon]:cursor-auto [&_.kg-bookmark-icon]:rounded-none [&_.kg-bookmark-icon]:border-0 [&_.kg-bookmark-thumbnail]:hidden',
);
