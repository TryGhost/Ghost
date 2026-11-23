// TEMPORARY (prototype): saves the newsletter preview as a PNG so design variations can be shared.
// Remove this file, the `data-preview-capture` attributes and the "Save PNG" button together.

import type { PreviewDevice } from './newsletter-spacing';

/** Marks the element the "Save PNG" button captures: the desktop window or the phone frame. */
export const PREVIEW_CAPTURE_ATTRIBUTE = 'data-preview-capture';

const SCROLLING = new Set(['auto', 'scroll']);

/**
 * Lets the cloned preview grow to the full email height, so the PNG holds the whole email and
 * not just the part visible on screen. Only scrolling elements are opened up; `overflow-hidden`
 * stays, since it clips the card's rounded corners.
 */
function expandToFullHeight(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view) {
    return;
  }

  // The preview is centred vertically; anchor it to the top so a tall clone isn't pushed off-canvas.
  if (root.parentElement) {
    root.parentElement.style.alignItems = 'flex-start';
  }

  for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    const style = view.getComputedStyle(element);
    if (element === root || SCROLLING.has(style.overflowY)) {
      element.style.overflow = 'visible';
      element.style.height = 'auto';
      element.style.maxHeight = 'none';
    }
  }
}

export async function downloadPreviewPng(device: PreviewDevice): Promise<void> {
  const target = document.querySelector<HTMLElement>(`[${PREVIEW_CAPTURE_ATTRIBUTE}]`);
  if (!target) {
    throw new Error('Newsletter preview not found');
  }

  // Loaded on demand so the library only downloads when someone takes a screenshot.
  const { default: html2canvas } = await import('html2canvas-pro');

  const canvas = await html2canvas(target, {
    backgroundColor: null,
    scale: 2,
    logging: false,
    useCORS: true,
    onclone: (_document, clone) => expandToFullHeight(clone),
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  if (!blob) {
    throw new Error('Could not create the PNG');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  link.href = url;
  link.download = `newsletter-preview-${device}-${stamp}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
