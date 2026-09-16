/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/context-object.js @ 407e032dc7 — transforms: imports→seam
import _ from '../utils/lodash.ts';
import { settingsCache } from '../seam/proxy.ts';

function getContextObject(data: any, context: any) {
  let chosenContext;

  // @TODO: meta layer is very broken, it's really hard to understand what it's doing
  // The problem is that handlebars root object is structured differently. Sometimes the object is flat on data
  // and sometimes the object is part of a key e.g. data.post. This needs to be prepared at the very first stage and not in each helper.
  if (_.includes(context, 'page') && data.post) {
    chosenContext = data.post;
  } else if (_.includes(context, 'post') && data.post) {
    chosenContext = data.post;
  } else if (_.includes(context, 'page') && data.page) {
    chosenContext = data.page;
  } else if (_.includes(context, 'tag') && data.tag) {
    chosenContext = data.tag;
  } else if (_.includes(context, 'author') && data.author) {
    chosenContext = data.author;
  } else if (data[context]) {
    // @NOTE: This is confusing as hell. It tries to get data[['author']], which works, but coincidence?
    chosenContext = data[context];
  }

  // If the data object does not contain the requested context, we return the fallback object.
  if (!chosenContext) {
    chosenContext = {
      cover_image: settingsCache.get('cover_image'),
      twitter: settingsCache.get('twitter'),
      facebook: settingsCache.get('facebook'),
    };
  }

  return chosenContext;
}

export default getContextObject;
