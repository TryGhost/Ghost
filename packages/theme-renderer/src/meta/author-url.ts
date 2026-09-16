/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/author-url.js @ 407e032dc7 — transforms: imports→seam
import { urlService } from '../seam/proxy.ts';
import getContextObject from './context-object.ts';

function getAuthorUrl(data: any, absolute?: boolean) {
  const context = data.context ? data.context[0] : null;

  const contextObject = getContextObject(data, context);

  if (data.author) {
    return urlService.getUrlForResource(
      { ...data.author, type: 'authors' },
      { absolute: absolute, withSubdirectory: true },
    );
  }

  if (contextObject && contextObject.primary_author) {
    return urlService.getUrlForResource(
      { ...contextObject.primary_author, type: 'authors' },
      { absolute: absolute, withSubdirectory: true },
    );
  }

  return null;
}

export default getAuthorUrl;
