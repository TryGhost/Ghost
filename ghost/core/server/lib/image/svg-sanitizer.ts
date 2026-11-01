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

// A reference within the SVG itself, such as `#gradient`.
const FRAGMENT = /^\s*#/;
// CSS that can reach outside the SVG: url() of anything but a fragment, other functions
// that take a URL or an element, and @import. Any backslash too, since `\75rl(` unescapes
// to `url(`.
const UNCONTAINED_CSS = /\\|@import|(?:element|image|image-set|src)\s*\(|url\s*\((?!\s*['"]?\s*#)/i;
// A fragment url() up to its `#`, where the ID prefix goes.
const URL_FRAGMENT = /url\s*\(\s*['"]?\s*#/gi;
// Illustrator writes entity declarations in the doctype. The HTML parser ends the doctype
// at the first `>`, inside them, so the rest would leak out as text.
const DOCTYPE_WITH_DECLARATIONS = /<!DOCTYPE[^[>]*\[[^\]]*\]\s*>/i;

/**
 * The sanitized SVG as XML, so it works as an image. Null if `body` holds anything besides
 * a single `<svg>`, such as an HTML page containing a logo.
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

// What sizes an <svg> in a page. With the namespaces, the only attributes the root keeps.
const ROOT_SIZE = new Set(['viewBox', 'width', 'height', 'preserveAspectRatio']);
// Attributes that only work on an <svg>, so they're dropped rather than moved to the <g>.
const SVG_ONLY = new Set([
  'x',
  'y',
  'version',
  'baseProfile',
  'zoomAndPan',
  'contentScriptType',
  'contentStyleType',
]);

/**
 * An inlined SVG's root is laid out like any box, so its styling could move or resize it.
 * A <g> isn't laid out, so the styling moves onto one around the content.
 */
const moveRootStyling: Svgo.CustomPlugin = {
  name: 'moveRootStyling',
  fn: () => ({
    element: {
      enter(node, parentNode) {
        if (parentNode.type !== 'root') {
          return;
        }
        const moved: Record<string, string> = {};
        for (const [name, value] of Object.entries(node.attributes)) {
          if (ROOT_SIZE.has(name) || name === 'xmlns' || name.startsWith('xmlns:')) {
            continue;
          }
          if (!SVG_ONLY.has(name)) {
            moved[name] = value;
          }
          delete node.attributes[name];
        }
        if (Object.keys(moved).length > 0) {
          node.children = [
            { type: 'element', name: 'g', attributes: moved, children: node.children },
          ];
        }
      },
    },
  }),
};

/**
 * Moves the stylesheet onto the elements it matches, then the root's styling onto its
 * content. Inlined, a <style> would apply to the whole page, while a `style` attribute only
 * affects its own element. Rules that depend on how the SVG is shown, such as `:hover` or
 * `@media`, are dropped. Design tools rarely export them.
 */
function flattenStyles(svg: string): string {
  // Loaded lazily, like jsdom.
  const { optimize } = require('svgo') as typeof Svgo;
  return optimize(svg, {
    plugins: [
      // removeMatchedSelectors would strip IDs that are still referenced.
      { name: 'inlineStyles', params: { onlyMatchedOnce: false, removeMatchedSelectors: false } },
      'removeStyleElement',
      moveRootStyling,
    ],
  }).data;
}

/**
 * Runs DOMPurify. `contained` applies the rules described on `sanitizeSvgContent`. An
 * `idPrefix` is only passed after `flattenStyles`: it prefixes IDs and references to them,
 * and drops <style> and `class`, whose styling is on the elements by then.
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
      // Harmless in an image, but if inlined, the page's focus, clicks and scripts would
      // reach links, tab stops and data attributes. A link's content is kept.
      FORBID_TAGS: [
        ...(contained ? ['image', 'feImage', 'a'] : []),
        ...(flattened ? ['style'] : []),
      ],
      FORBID_ATTR: [...(contained ? ['tabindex'] : []), ...(flattened ? ['class'] : [])],
      ALLOW_DATA_ATTR: !contained,
      // Some point at IDs we don't prefix, which would be the page's if inlined.
      ALLOW_ARIA_ATTR: !contained,
      // DOMPurify drops <use> because its href can load another document, but the hook
      // above only keeps fragments. Sketch exports draw shapes with <use>.
      ADD_TAGS: contained ? ['use'] : [],
      RETURN_DOM: true,
    },
  ) as HTMLElement;
  if (contained) {
    // Checked after DOMPurify: removing an element inside a <style> joins the text either
    // side, so `@im<script>x</script>port` becomes `@import`.
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
 * `selfContained` is for SVGs we don't trust, such as app icons. It also:
 *
 * - Removes references to other documents, so drawing the SVG never makes a request.
 *   Images go entirely, and a stylesheet with any external reference is emptied, since we
 *   can't safely trim CSS.
 * - Returns a standalone XML document that works as an image, or null for anything but a
 *   single SVG.
 * - Keeps the SVG from affecting the page if inlined: styling moves onto elements the page
 *   doesn't lay out (see `flattenStyles`), IDs get a prefix from the SVG's digest, and links,
 *   tab stops and data attributes are removed.
 */
export function sanitizeSvgContent(
  content: string,
  { selfContained = false }: { selfContained?: boolean } = {},
): string | null {
  const sanitized = purify(content, { contained: selfContained });
  if (!selfContained || sanitized === null) {
    return sanitized;
  }
  // SVGO rewrites the markup, so sanitize its output again.
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
