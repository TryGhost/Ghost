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

const createCard = require('../create-card');

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

module.exports = createCard({
    name: 'bookmark',
    type: 'dom',
    render(opts) {
        let {payload, env: {dom}} = opts;

        if (!payload.metadata || !payload.metadata.url || !payload.metadata.title || !payload.metadata.description) {
            return '';
        }

        let figure = createElement(dom, 'figure', 'kg-card kg-bookmark-card');
        let linkTag = createElement(dom, 'a', 'kg-bookmark-container', [{
            key: 'href',
            value: payload.metadata.url
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

    absoluteToRelative(urlUtils, payload, options) {
        if (payload.metadata) {
            payload.metadata.url = payload.metadata.url && urlUtils.absoluteToRelative(payload.metadata.url, options);
        }
        payload.caption = payload.caption && urlUtils.htmlAbsoluteToRelative(payload.caption, options);
        return payload;
    },

    relativeToAbsolute(urlUtils, payload, options) {
        if (payload.metadata) {
            payload.metadata.url = payload.metadata.url && urlUtils.relativeToAbsolute(payload.metadata.url, options);
        }
        payload.caption = payload.caption && urlUtils.htmlRelativeToAbsolute(payload.caption, options);
        return payload;
    }
});
