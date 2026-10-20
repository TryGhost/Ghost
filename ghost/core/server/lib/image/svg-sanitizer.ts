import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import logging from '@tryghost/logging';
import type CreateDOMPurify from 'dompurify';
import type JSDOMModule from 'jsdom';
import type * as Svgo from 'svgo';

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

// A reference to something within the SVG itself, such as `#gradient`.
const FRAGMENT = /^\s*#/;
// CSS that can reach beyond the SVG: a url() of anything but a fragment, the other
// functions that take a URL or an element, an import, or an escape, which could spell any
// of them.
const UNCONTAINED_CSS = /\\|@import|(?:element|image|image-set|src)\s*\(|url\s*\((?!\s*['"]?\s*#)/i;
// A url() of a fragment, up to its `#`. Once UNCONTAINED_CSS is ruled out, every url() is.
const URL_FRAGMENT = /url\s*\(\s*['"]?\s*#/gi;
// A doctype that declares entities, as Adobe Illustrator writes. Parsed as HTML, it ends at
// the first `>`, inside the declarations, and leaves the rest of them as text.
const DOCTYPE_WITH_DECLARATIONS = /<!DOCTYPE[^[>]*\[[^\]]*\]\s*>/i;

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
 * The SVG with its stylesheet moved onto the elements it styles, as `style` attributes.
 * The rules that can't be moved, since they depend on how the SVG is shown, such as
 * `:hover` or `@media (prefers-color-scheme: dark)`, are removed with the stylesheet.
 */
function flattenStyles(svg: string): string {
  // Loaded lazily, like jsdom.
  const { optimize } = require('svgo') as typeof Svgo;
  return optimize(svg, {
    plugins: [
      // Without removeMatchedSelectors, which drops IDs that are still referred to.
      { name: 'inlineStyles', params: { onlyMatchedOnce: false, removeMatchedSelectors: false } },
      'removeStyleElement',
    ],
  }).data;
}

/**
 * Sanitizes the content with DOMPurify. `contained` makes it self-contained, as
 * `sanitizeSvgContent` describes. With an `idPrefix`, every ID and every reference to one
 * gets the prefix, and anything that could only style the SVG through a stylesheet is
 * removed, since its stylesheet must have been flattened by then.
 */
function purify(
  content: string,
  { contained, idPrefix = null }: { contained: boolean; idPrefix?: string | null },
): string | null {
  // Loaded lazily: jsdom is slow to require and only needed for SVGs.
  const { JSDOM } = require('jsdom') as typeof JSDOMModule;
  const createDOMPurify = require('dompurify') as typeof CreateDOMPurify;
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);

  if (contained) {
    DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
      const isReference = data.attrName === 'href' || data.attrName === 'xlink:href';
      if (isReference ? !FRAGMENT.test(data.attrValue) : UNCONTAINED_CSS.test(data.attrValue)) {
        data.keepAttr = false;
      } else if (idPrefix !== null) {
        data.attrValue =
          data.attrName === 'id'
            ? idPrefix + data.attrValue
            : data.attrValue.replace(isReference ? FRAGMENT : URL_FRAGMENT, `$&${idPrefix}`);
      }
    });
  }

  const flattened = idPrefix !== null;
  const body = DOMPurify.sanitize(
    contained ? content.replace(DOCTYPE_WITH_DECLARATIONS, '') : content,
    {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: [...(contained ? ['image', 'feImage'] : []), ...(flattened ? ['style'] : [])],
      FORBID_ATTR: flattened ? ['class'] : [],
      // Some of them refer to elements by ID, which would be the page's if it's inlined.
      ALLOW_ARIA_ATTR: !contained,
      // DOMPurify leaves it out for its reference, which can only be a fragment here.
      ADD_TAGS: contained ? ['use'] : [],
      RETURN_DOM: true,
    },
  ) as HTMLElement;
  if (contained) {
    // Checked once DOMPurify is done: removing an element it doesn't allow removes the
    // element's text too, which joins the text either side of it.
    for (const style of body.querySelectorAll('style')) {
      if (UNCONTAINED_CSS.test(style.textContent ?? '')) {
        style.textContent = '';
      }
    }
  }
  const sanitized = contained ? standaloneSvg(body, window) : body.innerHTML;

  // Check whether the sanitized content still contains a non-empty <svg> tag
  const validSvgTag = sanitized?.match(/<svg[^>]*>\s*[\S]+[\S\s]*<\/svg>/);
  if (!sanitized || sanitized.trim() === '' || !validSvgTag) {
    return null;
  }

  return sanitized;
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
 *
 * It's also kept from reaching beyond its own elements if it's inlined into a page. Its
 * stylesheet is moved onto the elements it styles (see `flattenStyles`), and its IDs get a
 * prefix of its own, from a digest of it, so the page's elements and the SVG's never refer
 * to each other.
 */
export function sanitizeSvgContent(
  content: string,
  { selfContained = false }: { selfContained?: boolean } = {},
): string | null {
  const sanitized = purify(content, { contained: selfContained });
  if (!selfContained || sanitized === null) {
    return sanitized;
  }
  // Sanitized again, so nothing reaches the result without DOMPurify's checks.
  const flattened = flattenStyles(sanitized);
  const digest = createHash('sha256').update(flattened).digest('hex').slice(0, 16);
  return purify(flattened, { contained: true, idPrefix: `svg-${digest}-` });
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
