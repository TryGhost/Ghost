import createDebug from '@tryghost/debug';
import errors from '@tryghost/errors';
import { resolve as resolveUrl } from 'node:url';
import type Frame from './frame.ts';
import type { Dictionary } from './frame.ts';

const debug = createDebug('headers');
const { IncorrectUsageError } = errors;
const INVALIDATE_ALL = '/*';

interface HeaderOptions {
  value?: string | (() => string);
}

interface HeadersConfiguration {
  cacheInvalidate?: HeaderOptions | boolean;
  disposition?: HeaderOptions & { type: keyof typeof disposition };
  location?: false | { resolve?: (location: string) => string };
}

const cacheInvalidate = (_result: unknown, options: HeaderOptions = {}) => {
  const value = options.value;

  return {
    'X-Cache-Invalidate': value || INVALIDATE_ALL,
  };
};

const disposition = {
  /**
   * @description Generate CSV header.
   *
   * @param {Object} result - API response
   * @param {Object} options
   * @return {Object}
   */
  csv(_result: unknown, options: HeaderOptions = {}) {
    let value = options.value;

    if (typeof options.value === 'function') {
      value = options.value();
    }

    return {
      'Content-Disposition': `Attachment; filename="${value}"`,
      'Content-Type': 'text/csv',
    };
  },

  /**
   * @description Generate JSON header.
   *
   * @param {Object} result - API response
   * @param {Object} options
   * @return {Object}
   */
  json(result: unknown, options: HeaderOptions = {}) {
    return {
      'Content-Disposition': `Attachment; filename="${options.value}"`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(result)),
    };
  },

  /**
   * @description Generate YAML header.
   *
   * @param {Object} result - API response
   * @param {Object} options
   * @return {Object}
   */
  yaml(result: unknown, options: HeaderOptions = {}) {
    return {
      'Content-Disposition': `Attachment; filename="${options.value}"`,
      'Content-Type': 'application/yaml',
      'Content-Length': Buffer.byteLength(JSON.stringify(result)),
    };
  },

  /**
   * @description Content Disposition Header
   *
   * Create a header that invokes the 'Save As' dialog in the browser when exporting the database to file. The 'filename'
   * parameter is governed by [RFC6266](http://tools.ietf.org/html/rfc6266#section-4.3).
   *
   * For encoding whitespace and non-ISO-8859-1 characters, you MUST use the "filename*=" attribute, NOT "filename=".
   * Ideally, both. Examples: http://tools.ietf.org/html/rfc6266#section-5
   *
   * We'll use ISO-8859-1 characters here to keep it simple.
   *
   * @see http://tools.ietf.org/html/rfc598
   */
  file(_result: unknown, options: HeaderOptions = {}) {
    return Promise.resolve()
      .then(() => {
        let value = options.value;

        if (typeof options.value === 'function') {
          value = options.value();
        }

        return value;
      })
      .then((filename) => {
        return {
          'Content-Disposition': `Attachment; filename="${filename}"`,
        };
      });
  },
};

const headers = {
  /**
   * @description Get header based on ctrl configuration.
   *
   * @param {Object} result - API response
   * @param {Object} apiConfigHeaders
   * @param {import('@tryghost/api-framework').Frame} frame
   * @return {Promise<object>}
   */
  async get(result: unknown, apiConfigHeaders: HeadersConfiguration = {}, frame: Frame) {
    const responseHeaders: Record<string, string | number> = {};

    if (apiConfigHeaders.disposition) {
      const dispositionHeader = await disposition[apiConfigHeaders.disposition.type](
        result,
        apiConfigHeaders.disposition,
      );

      if (dispositionHeader) {
        Object.assign(responseHeaders, dispositionHeader);
      }
    }

    if (apiConfigHeaders.cacheInvalidate) {
      const cacheInvalidationHeader = cacheInvalidate(
        result,
        apiConfigHeaders.cacheInvalidate === true ? {} : apiConfigHeaders.cacheInvalidate,
      );

      if (cacheInvalidationHeader) {
        Object.assign(responseHeaders, cacheInvalidationHeader);
      }
    }

    const locationConfig = apiConfigHeaders.location || undefined;
    const locationHeaderDisabled = apiConfigHeaders.location === false;
    const hasLocationResolver = locationConfig?.resolve;
    const docName = frame.docName;
    const resources =
      docName && result && typeof result === 'object' ? (result as Dictionary)[docName] : undefined;
    const firstResource = Array.isArray(resources) ? resources[0] : undefined;
    const hasFrameData =
      (frame.method === 'add' || hasLocationResolver) &&
      firstResource &&
      typeof firstResource === 'object' &&
      'id' in firstResource;

    if (!locationHeaderDisabled && hasFrameData) {
      const requestUrl = frame.original.url;
      if (!requestUrl) {
        throw new IncorrectUsageError({
          message: 'Frame URL is required to generate a Location header',
        });
      }
      const protocol = requestUrl.secure === false ? 'http://' : 'https://';
      const resourceId = (firstResource as { id: string }).id;

      let locationURL = resolveUrl(`${protocol}${requestUrl.host}`, requestUrl.pathname ?? '');
      if (!locationURL.endsWith('/')) {
        locationURL += '/';
      }

      locationURL += `${resourceId}/`;

      if (hasLocationResolver) {
        locationURL = hasLocationResolver(locationURL);
      }

      const locationHeader = {
        Location: locationURL,
      };

      Object.assign(responseHeaders, locationHeader);
    }

    const headersFromFrame = frame.getHeaders();

    Object.assign(responseHeaders, headersFromFrame);

    debug(responseHeaders);
    return responseHeaders;
  },
};

export default headers;
