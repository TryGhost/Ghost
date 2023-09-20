import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {DateTime} from 'luxon';
import {renderEmptyContainer} from '../../utils/render-empty-container';

export function renderCollectionNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    // if we have no way to fetch post data, we cannot populate the card
    const renderData = options.renderData.get(node.getKey());
    if (!renderData) {
        return renderEmptyContainer(document);
    }

    const htmlString = cardTemplate(node, renderData);

    const element = document.createElement('div');
    element.innerHTML = htmlString?.trim();

    return {element: element.firstElementChild};
}

function cardTemplate(node, posts) {
    const {collection, postCount, layout, columns, header} = node.getDataset();

    const cardClass = 'kg-card kg-collection-card kg-width-wide';
    const headerClass = 'kg-collection-card-title';
    const collectionClass = 'kg-collection-card-feed'
        + (layout === 'list' ? ' kg-collection-card-list' : ' kg-collection-card-grid')
        + ((layout === 'grid' && columns === 1) ? ' columns-1' : '')
        + ((layout === 'grid' && columns === 2) ? ' columns-2' : '')
        + ((layout === 'grid' && columns === 3) ? ' columns-3' : '')
        + ((layout === 'grid' && columns === 4) ? ' columns-4' : '');

    return (
        `<div class="${cardClass}" data-kg-collection-slug="${collection}" data-kg-collection-limit="${postCount}">
            ${header ? `<h4 class="${headerClass}">${header}</h4>` : ''}
            <div class="${collectionClass}">
                ${posts.map(post => postTemplate(post, layout, columns)).join('')}
            </div>
        </div>`
    );
}

function postTemplate(post, layout, columns) {
    const {title, published_at: publishDate, excerpt, feature_image: image, reading_time: readTime, url} = post;

    const imageWrapperClass = 'kg-collection-card-img';
    const imageClass = '' 
        + ((layout === 'grid' && (columns === 1 || columns === 2)) ? ' aspect-video' : ' aspect-[3/2]')
        + (image === null ? ' invisible' : '');
    const titleClass = 'kg-collection-card-post-title';
    const excerptClass = 'kg-collection-card-post-excerpt';
    const metaClass = 'kg-collection-card-post-meta';
    const postWrapperClass = 'kg-collection-card-post-wrapper';

    return (
        `<a href=${url} class=${postWrapperClass}>
            <div class="kg-collection-card-post">
                ${image ? 
            `<div class=${imageWrapperClass}>
                        <img class=${imageClass} src="${image}" alt="${title}" />
                    </div>`
            : ''}
                <div class="kg-collection-card-content">
                    ${title ? `<h2 class=${titleClass}>${title}</h2>` : ''}
                    ${excerpt ? `<p class=${excerptClass}>${excerpt}</p>` : ''}
                    <div class=${metaClass}>
                        ${publishDate ? `<p>${DateTime.fromISO(publishDate).toFormat('d LLL yyyy')}</p>` : ''}
                        ${readTime > 0 ? `<p>&nbsp;&middot; ${readTime} min</p>` : ''}
                    </div>
                </div>
            </div>
        </a>`
    );
}