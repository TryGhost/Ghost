const SimpleDom = require('simple-dom');
const {
    absoluteToRelative,
    relativeToAbsolute,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute
} = require('@tryghost/url-utils/lib/utils');

const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

/**
<figure class="kg-card kg-bookmark-card">
  <a href="[URL]" class="kg-bookmark-container">
    <div class="kg-bookmark-content">
      <div class="kg-bookmark-title">[TITLE]</div>
      <div class="kg-bookmark-description">[DESCRIPTION]</div>
      <div class="kg-bookmark-metadata">
        <img src="[ICON]" class="kg-bookmark-icon">
        <span class="kg-bookmark-author">[AUTHOR]</span>
        <span class="kg-bookmark-publisher">[PUBLISHER]</span>
      </div>
    </div>
    <div class="kg-bookmark-thumbnail">
      <img src="[THUMBNAIL]">
    </div>
  </a>
</figure>
 */

function dedent(literals, ...values) {
    // interweave strings with substitutions
    let output = '';
    for (let i = 0; i < values.length; i++) {
        output += literals[i] + values[i];
    }
    output += literals[values.length];

    // split on newlines
    let lines = output.split(/\n/);

    // remove leading whitespace
    return lines.map(line => line.replace(/^\s+/gm, '')).join('').trim();
}

module.exports = {
    name: 'bookmark',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.metadata || !payload.url || !payload.metadata.title) {
            return dom.createTextNode('');
        }

        let markup = dedent`
            <figure class="kg-card kg-bookmark-card${payload.caption ? ' kg-card-hascaption' : ''}">
                <a class="kg-bookmark-container" href="${serializer.escapeAttrValue(payload.url || '')}">
                    <div class="kg-bookmark-content">
                        <div class="kg-bookmark-title">${serializer.escapeText(payload.metadata.title || '')}</div>
                        <div class="kg-bookmark-description">${serializer.escapeText(payload.metadata.description || '')}</div>
                        <div class="kg-bookmark-metadata">
                            !!ICON!!
                            !!AUTHOR!!
                            !!PUBLISHER!!
                        </div>
                    </div>
                    !!THUMBNAIL!!
                </a>
                !!FIGCAPTION!!
            </figure>
        `;
        const iconMarkup = dedent`
            <img class="kg-bookmark-icon" src="${serializer.escapeAttrValue(payload.metadata.icon || '')}">
        `;
        const authorMarkup = dedent`
            <span class="kg-bookmark-author">${serializer.escapeText(payload.metadata.author || '')}</span>
        `;
        const publisherMarkup = dedent`
            <span class="kg-bookmark-publisher">${serializer.escapeText(payload.metadata.publisher || '')}</span>
        `;
        const thumbnailMarkup = dedent`
            <div class="kg-bookmark-thumbnail">
                <img src="${serializer.escapeAttrValue(payload.metadata.thumbnail || '')}">
            </div>
        `;
        const figcaptionMarkup = dedent`
            <figcaption>${payload.caption}</figcaption>
        `;
        markup = markup.replace('!!ICON!!', payload.metadata.icon ? iconMarkup : '');
        markup = markup.replace('!!AUTHOR!!', payload.metadata.author ? authorMarkup : '');
        markup = markup.replace('!!PUBLISHER!!', payload.metadata.publisher ? publisherMarkup : '');
        markup = markup.replace('!!THUMBNAIL!!', payload.metadata.thumbnail ? thumbnailMarkup : '');
        markup = markup.replace('!!FIGCAPTION!!', payload.caption ? figcaptionMarkup : '');

        return dom.createRawHTMLSection(markup);
    },

    absoluteToRelative(payload, options) {
        if (payload.url) {
            payload.url = payload.url && absoluteToRelative(payload.url, options.siteUrl, options);
        }
        if (payload.metadata && payload.metadata.url) {
            payload.metadata.url = payload.metadata.url && absoluteToRelative(payload.metadata.url, options.siteUrl, options);
        }
        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        if (payload.url) {
            payload.url = payload.url && relativeToAbsolute(payload.url, options.siteUrl, options.itemUrl, options);
        }
        if (payload.metadata && payload.metadata.url) {
            payload.metadata.url = payload.metadata.url && relativeToAbsolute(payload.metadata.url, options.siteUrl, options.itemUrl, options);
        }
        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};
