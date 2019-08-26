/**
<figure class="kg-card kg-bookmark-card">
  <div class="kg-bookmark-container">
    <a href="[URL]">
      <div class="kg-bookmark-content">
        <div class="kg-bookmark-title">[TITLE]</div>
        <div class="kg-bookmark-description">[DESCRIPTION]</div>
        <div class="kg-bookmark-metadata">
          <img src="[LOGO]" class="kg-bookmark-logo">
          <span class="kg-bookmark-author">[AUTHOR]</span>
          <span class="kg-bookmark-url">[URL/DOMAIN]</span>
        </div>
      </div>
      <div class="kg-bookmark-thumbnail">
        [THUMBNAIL]
      </div>
    </a>
</figure> 
 */

const createCard = require('../create-card');

function createElement(dom, elem, classNames = '', attributes = [], text) {
    let element = dom.createElement(elem);
    if (classNames) {
        element.setAttribute('class', classNames)
    }
    attributes.forEach((attr) => {
        element.setAttribute(attr.key, attr.value);
    })
    if (text) {
        element.appendChild(dom.createTextNode(text))
    }
    return element;
}

module.exports = createCard({
    name: 'bookmark',
    type: 'dom',
    render(opts) {
        if (!opts.payload.metadata) {
            return '';
        }

        let {payload, env: {dom}} = opts;
        let figure = createElement(dom, 'figure', 'kg-card kg-bookmark-card');
        let containerDiv = createElement(dom, 'div', 'kg-bookmark-container');
        let linkTag = createElement(dom, 'a', '', [{
            key: 'href', 
            value: payload.metadata.url
        }]);
        let contentDiv = createElement(dom, 'div', 'kg-bookmark-content');
        let titleDiv = createElement(dom, 'div', 'kg-bookmark-title', [] , payload.metadata.title);
        let descriptionDiv = createElement(dom, 'div', 'kg-bookmark-description', [] , payload.metadata.description);
        let metadataDiv = createElement(dom, 'div', 'kg-bookmark-metadata');
        let imgLogo = createElement(dom, 'img', 'kg-bookmark-logo', [{
            key: 'src',
            value: payload.metadata.logo
        }]);
        let authorSpan = createElement(dom, 'span', 'kg-bookmark-author', [] , payload.metadata.author);
        let publisherSpan = createElement(dom, 'span', 'kg-bookmark-url', [] , payload.metadata.publisher);
        let thumbnailDiv = createElement(dom, 'div', 'kg-bookmark-thumbnail');
        let thumbnailImg = createElement(dom, 'img', '', [{
            key: 'src',
            value: payload.metadata.image
        }]);
        thumbnailDiv.appendChild(thumbnailImg);
        metadataDiv.appendChild(imgLogo);
        metadataDiv.appendChild(authorSpan);
        metadataDiv.appendChild(publisherSpan);
        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(descriptionDiv);
        contentDiv.appendChild(metadataDiv);
        linkTag.appendChild(contentDiv);
        linkTag.appendChild(thumbnailDiv);
        containerDiv.appendChild(linkTag);
        figure.appendChild(containerDiv);

        if (payload.caption) {
            let figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    }
});
