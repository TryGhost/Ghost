import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import logging from '@tryghost/logging';
import type CreateDOMPurify from 'dompurify';
import type JSDOMModule from 'jsdom';

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

// A reference to something within the SVG itself, such as `#gradient`.
const FRAGMENT = /^\s*#/;
// CSS that can load another document: a url() of anything but a fragment, the other
// functions that take a URL, an import, or an escape, which could spell any of them.
const LOADS_CSS = /\\|@import|(?:image|image-set|src)\s*\(|url\s*\(\s*(?!['"]?\s*#)/i;

/**
 * The sanitized SVG as a document of its own, written as XML so it can be drawn as an
 * image. Null if `body` holds anything besides a single `<svg>`, such as the rest of an
 * HTML page with an SVG in it.
 */
function standaloneSvg(body: HTMLElement, window: JSDOMModule.DOMWindow): string | null {
  const [root, ...rest] = [...body.childNodes].filter(
    (node) =>
      node.nodeType === window.Node.ELEMENT_NODE ||
      (node.nodeType === window.Node.TEXT_NODE && node.textContent!.trim() !== ''),
  );
  if (rest.length > 0 || !(root instanceof window.SVGSVGElement)) {
    return null;
  }
  return new window.XMLSerializer().serializeToString(root);
}

/**
 * Returns sanitized SVG content, or null if the content is invalid.
 *
 * `selfContained` also removes every reference to another document, such as an external
 * image, link or stylesheet URL, so drawing the SVG never requests anything. Images are
 * removed outright, since they only ever show another document, and a stylesheet with a
 * reference is emptied, since CSS can't be pared down safely here. The SVG is returned as
 * a document of its own, which can be drawn as an image, or null if the content is
 * anything but a single SVG.
 */
export function sanitizeSvgContent(
  content: string,
  { selfContained = false }: { selfContained?: boolean } = {},
): string | null {
  // Loaded lazily: jsdom is slow to require and only needed for SVGs.
  const { JSDOM } = require('jsdom') as typeof JSDOMModule;
  const createDOMPurify = require('dompurify') as typeof CreateDOMPurify;
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);

  if (selfContained) {
    DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
      const isReference = data.attrName === 'href' || data.attrName === 'xlink:href';
      if (isReference ? !FRAGMENT.test(data.attrValue) : LOADS_CSS.test(data.attrValue)) {
        data.keepAttr = false;
      }
    });
  }

  const body = DOMPurify.sanitize(content, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: selfContained ? ['image', 'feImage'] : [],
    RETURN_DOM: true,
  }) as HTMLElement;
  if (selfContained) {
    // Checked once DOMPurify is done: removing an element it doesn't allow removes the
    // element's text too, which joins the text either side of it.
    for (const style of body.querySelectorAll('style')) {
      if (LOADS_CSS.test(style.textContent ?? '')) {
        style.textContent = '';
      }
    }
  }
  const sanitized = selfContained ? standaloneSvg(body, window) : body.innerHTML;

  // Check whether the sanitized content still contains a non-empty <svg> tag
  const validSvgTag = sanitized?.match(/<svg[^>]*>\s*[\S]+[\S\s]*<\/svg>/);
  if (!sanitized || sanitized.trim() === '' || !validSvgTag) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitizes the contents of an .svg or .svgz file.
 *
 * @returns the sanitized file contents, or null if the SVG could not be sanitized
 */
export async function sanitizeSvgBuffer(buffer: Buffer, isZipped = false): Promise<Buffer | null> {
  try {
    const original = isZipped ? (await gunzip(buffer)).toString() : buffer.toString('utf8');
    const sanitized = sanitizeSvgContent(original);

    if (!sanitized) {
      return null;
    }

    return isZipped ? await gzip(sanitized) : Buffer.from(sanitized);
  } catch (error) {
    logging.error('Error sanitizing SVG:', error);
    return null;
  }
}

/**
 * Sanitizes an .svg or .svgz file in place. Only files in the temp directory,
 * where uploads and extracted imports are written, can be rewritten.
 *
 * @returns whether the SVG could be sanitized
 */
export async function sanitizeSvgFile(filepath: string, isZipped = false): Promise<boolean> {
  const resolvedPath = path.resolve(filepath);
  if (!resolvedPath.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
    logging.error(`Refused to sanitize SVG outside the temp directory: ${filepath}`);
    return false;
  }

  try {
    const sanitized = await sanitizeSvgBuffer(await fs.readFile(resolvedPath), isZipped);

    if (!sanitized) {
      return false;
    }

    await fs.writeFile(resolvedPath, sanitized);
    return true;
  } catch (error) {
    logging.error('Error sanitizing SVG:', error);
    return false;
  }
}
