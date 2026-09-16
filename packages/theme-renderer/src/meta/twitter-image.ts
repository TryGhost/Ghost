/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/twitter-image.js @ 407e032dc7 — transforms: imports→seam
import _ from '../utils/lodash.ts';
import { settingsCache, urlUtils } from '../seam/proxy.ts';
import getContextObject from './context-object.ts';

function getTwitterImage(data: any) {
  const context = data.context ? data.context : null;
  const contextObject = getContextObject(data, context);

  if (_.includes(context, 'home')) {
    const imgUrl = settingsCache.get('twitter_image') || settingsCache.get('cover_image');
    return (imgUrl && urlUtils.relativeToAbsolute(imgUrl)) || null;
  }

  if (_.includes(context, 'post') || _.includes(context, 'page')) {
    if (contextObject.twitter_image) {
      return urlUtils.relativeToAbsolute(contextObject.twitter_image);
    } else if (contextObject.feature_image) {
      return urlUtils.relativeToAbsolute(contextObject.feature_image);
    } else if (settingsCache.get('twitter_image')) {
      return urlUtils.relativeToAbsolute(settingsCache.get('twitter_image'));
    } else if (settingsCache.get('cover_image')) {
      return urlUtils.relativeToAbsolute(settingsCache.get('cover_image'));
    }
  }

  if (_.includes(context, 'author') && contextObject.cover_image) {
    return urlUtils.relativeToAbsolute(contextObject.cover_image);
  }

  if (_.includes(context, 'tag')) {
    if (contextObject.twitter_image) {
      return urlUtils.relativeToAbsolute(contextObject.twitter_image);
    } else if (contextObject.feature_image) {
      return urlUtils.relativeToAbsolute(contextObject.feature_image);
    } else if (settingsCache.get('cover_image')) {
      return urlUtils.relativeToAbsolute(settingsCache.get('cover_image'));
    }
  }

  return null;
}

export default getTwitterImage;
