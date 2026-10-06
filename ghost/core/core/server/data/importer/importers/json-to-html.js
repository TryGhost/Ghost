const SimpleDom = require('simple-dom');
const sanitizeHtml = require('sanitize-html');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);
const { cards } = require('@tryghost/kg-default-cards');
const imageCard = cards.find((c) => c.name === 'image');
const embedCard = cards.find((c) => c.name === 'embed');

const getValidURL = (url) => {
  const normalizedURL = typeof url === 'string' ? url.trim() : '';

  if (!normalizedURL) {
    return '';
  }

  try {
    const parsedURL = new URL(normalizedURL, 'https://example.com');
    if (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') {
      return normalizedURL;
    }
  } catch {
    // Invalid URLs are omitted from imported links
  }

  return '';
};

// Revue exports only contain basic formatted text, so imported HTML is reduced
// to an allowlist. This also drops comments such as `<!--kg-card-begin: html-->`
// and card markup that the HTML to Lexical converter would keep as raw HTML
const INLINE_TAGS = [
  'br',
  'span',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'del',
  'sub',
  'sup',
  'code',
  'a',
];

const BLOCK_SANITIZE_OPTIONS = {
  allowedTags: [
    ...INLINE_TAGS,
    'p',
    'hr',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'title'],
    img: ['src', 'alt', 'title'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  allowProtocolRelative: false,
};

// Titles and captions are placed inside headings and figcaptions, so block
// elements would produce invalid nesting
const INLINE_SANITIZE_OPTIONS = {
  ...BLOCK_SANITIZE_OPTIONS,
  allowedTags: INLINE_TAGS,
};

// Link titles are also wrapped in the item's own link, and anchors can't nest
const LINK_TEXT_SANITIZE_OPTIONS = {
  ...BLOCK_SANITIZE_OPTIONS,
  allowedTags: INLINE_TAGS.filter((tag) => tag !== 'a'),
};

const sanitizeImportedHTML = (html, options = BLOCK_SANITIZE_OPTIONS) => {
  return sanitizeHtml(typeof html === 'string' ? html : '', options);
};

const getVideoEmbedHTML = (url) => {
  let parsedURL;

  try {
    parsedURL = new URL(typeof url === 'string' ? url.trim() : '');
  } catch {
    return '';
  }

  if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
    return '';
  }

  const hostname = parsedURL.hostname.toLowerCase().replace(/^(?:www|m)\./, '');
  const firstPathSegment = parsedURL.pathname.split('/')[1];

  let youTubeID = null;
  if (hostname === 'youtube.com' && parsedURL.pathname === '/watch') {
    youTubeID = parsedURL.searchParams.get('v');
  } else if (hostname === 'youtu.be') {
    youTubeID = firstPathSegment;
  }

  if (youTubeID && /^[a-zA-Z0-9_-]+$/.test(youTubeID)) {
    return `<iframe width="200" height="113" src="https://www.youtube.com/embed/${youTubeID}?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }

  if (hostname === 'vimeo.com' && /^[0-9]+$/.test(firstPathSegment)) {
    return `<iframe src="https://player.vimeo.com/video/${firstPathSegment}" width="200" height="113" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  }

  return '';
};

// Take the array of items for a specific post and return the converted HTML
const itemsToHtml = (items) => {
  const itemHTMLChunks = [];
  items.forEach((item) => {
    const type = item.item_type;

    if (type === 'header') {
      itemHTMLChunks.push(`<h3>${sanitizeImportedHTML(item.title, INLINE_SANITIZE_OPTIONS)}</h3>`);
    } else if (type === 'text') {
      itemHTMLChunks.push(sanitizeImportedHTML(item.description)); // THis is basic text HTML with <p>, <b>, <a>, etc (no media)
    } else if (type === 'image') {
      // We have 2 values to work with here. `image` is smaller and most suitable, and `original_image_url` is the full-res that would need to be resized
      // - item.image (https://s3.amazonaws.com/revue/items/images/019/005/542/web/anita-austvika-C-JUrfmYqcw-unsplash.jpg?1667924147)
      // - item.original_image_url (https://s3.amazonaws.com/revue/items/images/019/005/542/original/anita-austvika-C-JUrfmYqcw-unsplash.jpg?1667924147)
      const cardOpts = {
        env: { dom: new SimpleDom.Document() },
        payload: {
          src: item.image,
          caption: sanitizeImportedHTML(item.description, INLINE_SANITIZE_OPTIONS),
        },
      };

      itemHTMLChunks.push(serializer.serialize(imageCard.render(cardOpts)));
    } else if (type === 'link') {
      // This could be a bookmark, or it could be a paragraph of text with a linked header, there's no way to tell
      // The safest option here is to output an image with text under it
      const itemURL = getValidURL(item.url);
      const title = sanitizeImportedHTML(item.title, LINK_TEXT_SANITIZE_OPTIONS);
      const cardOpts = {
        env: { dom: new SimpleDom.Document() },
        payload: {
          src: item.image,
          caption: title,
          href: itemURL,
        },
      };
      itemHTMLChunks.push(serializer.serialize(imageCard.render(cardOpts)));
      const linkTitleHTML = itemURL
        ? `<a href="${serializer.escapeAttrValue(itemURL)}">${title}</a>`
        : title;
      const linkHTML = `<h4>${linkTitleHTML}</h4>${sanitizeImportedHTML(item.description)}`;
      itemHTMLChunks.push(linkHTML);
    } else if (type === 'tweet') {
      const tweetURL = getValidURL(item.url);
      if (!tweetURL) {
        return;
      }
      // Should this be an oEmbed call? Probably.
      itemHTMLChunks.push(`<figure class="kg-card kg-embed-card">
                <blockquote class="twitter-tweet"><a href="${serializer.escapeAttrValue(tweetURL)}"></a></blockquote>
                <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                </figure>`);
    } else if (type === 'video') {
      const cardOpts = {
        env: { dom: new SimpleDom.Document() },
        payload: {
          html: getVideoEmbedHTML(item.url),
          caption: sanitizeImportedHTML(item.description, INLINE_SANITIZE_OPTIONS),
        },
      };

      itemHTMLChunks.push(serializer.serialize(embedCard.render(cardOpts)));
    }
  });
  return itemHTMLChunks.join('\n');
};

const getPostDate = (data) => {
  const isPublished = data.sent_at ? true : false; // This is how we determine is a post is published or not
  const postDate = isPublished ? new Date(data.sent_at) : new Date();

  return postDate.toISOString();
};

const getPostStatus = (data) => {
  const isPublished = data.sent_at ? true : false; // This is how we determine is a post is published or not
  return isPublished ? 'published' : 'draft';
};

const cleanCsvHTML = (data) => {
  data = typeof data === 'string' ? data : '';

  // Blockquotes need to have some sort of wrapping elements around all contents
  // Wrap all content in <p> tags. The HTML to Mobiledoc parse can handle duplicate <p> tags.
  data = data.replace(/<blockquote.*?>(.*?)<\/blockquote>/gm, '<blockquote><p>$1</p></blockquote>');

  // These exports have a lot of <p><br></p> that we don't want
  data = data.replace(/<p><br><\/p>/gm, '');

  return sanitizeImportedHTML(data);
};

module.exports = {
  itemsToHtml,
  getPostDate,
  getPostStatus,
  cleanCsvHTML,
};
