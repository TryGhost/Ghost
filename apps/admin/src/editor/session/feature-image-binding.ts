import { useCallback, useRef, useState } from 'react';
import { cleanBasicHtml } from '@tryghost/kg-clean-basic-html';
import type { EditorRecord } from './projection';

export interface FeatureImagePatch {
  feature_image?: string | null;
  feature_image_alt?: string | null;
  feature_image_caption?: string | null;
}

/** The session calls the feature image needs; the rest of the handle is irrelevant to it. */
export interface FeatureImagePort {
  patchFeatureImage: (patch: FeatureImagePatch) => void;
  dispatchField: () => void;
}

export interface FeatureImageBinding {
  featureImage: string | null;
  featureImageAlt: string | null;
  /** Wrapped in a paragraph, the shape the caption editor loads. */
  featureImageCaption: string | null;
  onFeatureImageChange: (url: string) => void;
  onFeatureImageClear: () => void;
  onFeatureImageAltChange: (alt: string) => void;
  onFeatureImageCaptionChange: (html: string) => void;
  onFeatureImageCaptionBlur: () => void;
}

/** The stored caption is the paragraph's inner content, not the paragraph. */
export function cleanCaptionHtml(html: string | null | undefined): string {
  return cleanBasicHtml(html ?? '', { firstChildInnerContent: true });
}

// The style attribute is read as written, not through the CSSOM: browsers
// expand `white-space` into longhands, so a property count cannot identify it.
function isLexicalPlainTextSpan(element: Element): boolean {
  if (element.tagName !== 'SPAN' || element.attributes.length !== 1) {
    return false;
  }

  const declarations = (element.getAttribute('style') ?? '')
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean);

  return declarations.length === 1 && /^white-space\s*:\s*pre-wrap$/i.test(declarations[0]);
}

/** The caption editor parses a document, so a bare fragment needs its paragraph back. */
export function withCaptionParagraph(html: string | null | undefined): string | null {
  if (!html) {
    return null;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.firstElementChild?.tagName === 'P' ? html : `<p>${html}</p>`;
}

/**
 * One comparable form for a caption in either shape. Both sides are wrapped
 * back into a paragraph first, so `firstChildInnerContent` unwraps that
 * paragraph rather than a caption's own leading element, and Lexical's
 * load-time `white-space: pre-wrap` spans are ignored.
 */
export function normalizeCaptionHtml(html: string | null | undefined): string {
  const cleaned = cleanCaptionHtml(withCaptionParagraph(html));
  const doc = new DOMParser().parseFromString(cleaned, 'text/html');

  doc.body.querySelectorAll('span').forEach((element) => {
    if (isLexicalPlainTextSpan(element)) {
      element.replaceWith(...element.childNodes);
    }
  });

  return doc.body.innerHTML.trim();
}

/**
 * Feature image, alt text and caption as the editor holds them. Setting,
 * clearing and alt edits save immediately; the caption saves on blur.
 */
export function useFeatureImageBinding(
  port: FeatureImagePort,
  record?: EditorRecord,
): FeatureImageBinding {
  const session = useRef(port);
  session.current = port;

  const [featureImage, setFeatureImage] = useState(record?.feature_image ?? null);
  const [featureImageAlt, setFeatureImageAlt] = useState(record?.feature_image_alt ?? null);
  const [caption, setCaption] = useState(record?.feature_image_caption ?? null);
  const captionRef = useRef(caption);
  captionRef.current = caption;

  const onFeatureImageChange = useCallback((url: string) => {
    setFeatureImage(url);
    session.current.patchFeatureImage({ feature_image: url });
    session.current.dispatchField();
  }, []);

  const onFeatureImageClear = useCallback(() => {
    setFeatureImage(null);
    setFeatureImageAlt(null);
    setCaption(null);
    session.current.patchFeatureImage({
      feature_image: null,
      feature_image_alt: null,
      feature_image_caption: null,
    });
    session.current.dispatchField();
  }, []);

  const onFeatureImageAltChange = useCallback((alt: string) => {
    setFeatureImageAlt(alt);
    session.current.patchFeatureImage({ feature_image_alt: alt });
    session.current.dispatchField();
  }, []);

  const onFeatureImageCaptionChange = useCallback((html: string) => {
    const cleaned = cleanCaptionHtml(html);
    if (normalizeCaptionHtml(cleaned) === normalizeCaptionHtml(captionRef.current)) {
      return;
    }
    setCaption(cleaned);
    session.current.patchFeatureImage({ feature_image_caption: cleaned });
  }, []);

  const onFeatureImageCaptionBlur = useCallback(() => session.current.dispatchField(), []);

  return {
    featureImage,
    featureImageAlt,
    featureImageCaption: withCaptionParagraph(caption),
    onFeatureImageChange,
    onFeatureImageClear,
    onFeatureImageAltChange,
    onFeatureImageCaptionChange,
    onFeatureImageCaptionBlur,
  };
}
