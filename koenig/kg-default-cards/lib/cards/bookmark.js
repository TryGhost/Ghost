const {
    absoluteToRelative,
    relativeToAbsolute,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute
} = require('@tryghost/url-utils/lib/utils');

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

function createElement(dom, elem, classNames = '', attributes = [], text) {
    let element = dom.createElement(elem);
    if (classNames) {
        element.setAttribute('class', classNames);
    }
    attributes.forEach((attr) => {
        element.setAttribute(attr.key, attr.value);
    });
    if (text) {
        element.appendChild(dom.createTextNode(text));
    }
    return element;
}

module.exports = {
    name: 'bookmark',
    type: 'dom',

    render({payload, env: {dom}}) {
        if (!payload.metadata || !payload.url || !payload.metadata.title) {
            return dom.createTextNode('');
        }

        let figure = createElement(dom, 'figure', 'kg-card kg-bookmark-card');
        let linkTag = createElement(dom, 'a', 'kg-bookmark-container', [{
            key: 'href',
            value: payload.url
        }]);
        let contentDiv = createElement(dom, 'div', 'kg-bookmark-content');
        let titleDiv = createElement(dom, 'div', 'kg-bookmark-title', [] , payload.metadata.title);
        let descriptionDiv = createElement(dom, 'div', 'kg-bookmark-description', [] , payload.metadata.description);
        let metadataDiv = createElement(dom, 'div', 'kg-bookmark-metadata');
        let imgIcon = createElement(dom, 'img', 'kg-bookmark-icon', [{
            key: 'src',
            value: payload.metadata.icon
        }]);
        let authorSpan = createElement(dom, 'span', 'kg-bookmark-author', [] , payload.metadata.author);
        let publisherSpan = createElement(dom, 'span', 'kg-bookmark-publisher', [] , payload.metadata.publisher);
        let thumbnailDiv = createElement(dom, 'div', 'kg-bookmark-thumbnail');
        let thumbnailImg = createElement(dom, 'img', '', [{
            key: 'src',
            value: payload.metadata.thumbnail
        }]);
        thumbnailDiv.appendChild(thumbnailImg);
        if (payload.metadata.icon) {
            metadataDiv.appendChild(imgIcon);
        }
        if (payload.metadata.author) {
            metadataDiv.appendChild(authorSpan);
        }
        if (payload.metadata.publisher) {
            metadataDiv.appendChild(publisherSpan);
        }
        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(descriptionDiv);
        contentDiv.appendChild(metadataDiv);
        linkTag.appendChild(contentDiv);
        if (payload.metadata.thumbnail) {
            linkTag.appendChild(thumbnailDiv);
        }
        figure.appendChild(linkTag);

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
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
