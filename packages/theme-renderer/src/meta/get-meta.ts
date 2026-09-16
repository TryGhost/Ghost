/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/get-meta.js @ 407e032dc7 — transforms: imports→seam
import { settingsCache, urlUtils } from '../seam/proxy.ts';
import { logging } from '../seam/shared.ts';

// These are in filename order
import getAuthorFacebook from './author-fb-url.ts';
import getAuthorImage from './author-image.ts';
import getAuthorUrl from './author-url.ts';
import getBlogLogo from './blog-logo.ts';
import getCanonicalUrl from './canonical-url.ts';
import getCoverImage from './cover-image.ts';
import getCreatorTwitter from './creator-url.ts';
import getDescription from './description.ts';
import getExcerpt from './excerpt.ts';
import getImageDimensions from './image-dimensions.ts';
import getKeywords from './keywords.ts';
import getModifiedDate from './modified-date.ts';
import { getOgType } from './og-type.ts';
import getOgImage from './og-image.ts';
import getPaginatedUrl from './paginated-url.ts';
import getPublishedDate from './published-date.ts';
import getRssUrl from './rss-url.ts';
import { getSchema } from './schema.ts';
import getStructuredData from './structured-data.ts';
import getTitle from './title.ts';
import getTwitterImage from './twitter-image.ts';
import getUrl from './url.ts';

function getMetaData(data: any, root: any) {
  const metaData: any = {
    url: getUrl(data, true),
    canonicalUrl: getCanonicalUrl(data),
    previousUrl: getPaginatedUrl('prev', data, true),
    nextUrl: getPaginatedUrl('next', data, true),
    authorUrl: getAuthorUrl(data, true),
    rssUrl: getRssUrl(data, true),
    metaTitle: getTitle(data, root),
    metaDescription: getDescription(data, root) || null,
    excerpt: getExcerpt(data),
    coverImage: {
      url: getCoverImage(data),
    },
    authorImage: {
      url: getAuthorImage(data, true),
    },
    ogImage: {
      url: getOgImage(data),
    },
    ogTitle: getTitle(data, root, { property: 'og' }),
    ogDescription: getDescription(data, root, { property: 'og' }),
    twitterImage: getTwitterImage(data),
    twitterTitle: getTitle(data, root, { property: 'twitter' }),
    twitterDescription: getDescription(data, root, { property: 'twitter' }),
    authorFacebook: getAuthorFacebook(data),
    creatorTwitter: getCreatorTwitter(data),
    keywords: getKeywords(data),
    publishedDate: getPublishedDate(data),
    modifiedDate: getModifiedDate(data),
    ogType: getOgType(data),
    // @TODO: pass into each meta helper - wrap each helper
    site: {
      title: settingsCache.get('title'),
      description: settingsCache.get('description'),
      url: urlUtils.urlFor('home', true),
      facebook: settingsCache.get('facebook'),
      twitter: settingsCache.get('twitter'),
      timezone: settingsCache.get('timezone'),
      navigation: settingsCache.get('navigation'),
      icon: settingsCache.get('icon'),
      cover_image: settingsCache.get('cover_image'),
      logo: getBlogLogo(),
    },
  };

  if (data.post && data.post.primary_author && data.post.primary_author.name) {
    metaData.authorName = data.post.primary_author.name;
  }

  // @TODO: wrap this in a utility function
  return getImageDimensions(metaData)
    .then(function () {
      metaData.structuredData = getStructuredData(metaData);
      metaData.schema = getSchema(metaData, data);

      return metaData;
    })
    .catch(function (err: any) {
      logging.error(err);
      return metaData;
    });
}

export default getMetaData;
