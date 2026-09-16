/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/published-date.js @ 407e032dc7 — transforms: imports→seam
import getContextObject from './context-object.ts';

function getPublishedDate(data: any) {
  const context = data.context ? data.context[0] : null;

  const contextObject = getContextObject(data, context);

  if (contextObject && contextObject.published_at) {
    return new Date(contextObject.published_at).toISOString();
  }
  return null;
}

export default getPublishedDate;
