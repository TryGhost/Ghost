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

/**
 * Returns sanitized SVG content, or null if the content is invalid.
 */
export function sanitizeSvgContent(content: string): string | null {
  // Loaded lazily: jsdom is slow to require and only needed for SVGs.
  const { JSDOM } = require('jsdom') as typeof JSDOMModule;
  const createDOMPurify = require('dompurify') as typeof CreateDOMPurify;
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);

  const sanitized = DOMPurify.sanitize(content, { USE_PROFILES: { svg: true, svgFilters: true } });

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
