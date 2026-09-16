/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/modified-date.js @ 407e032dc7 — transforms: imports→seam
import getContextObject from './context-object.ts';

function getModifiedDate(data: any) {
  const context = data.context ? data.context : null;
  let modDate;

  const contextObject = getContextObject(data, context);

  if (contextObject) {
    modDate = contextObject.updated_at || null;
    if (modDate) {
      return new Date(modDate).toISOString();
    }
  }
  return null;
}

export default getModifiedDate;
