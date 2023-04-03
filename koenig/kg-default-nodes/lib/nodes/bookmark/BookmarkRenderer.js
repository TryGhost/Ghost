import {addCreateDocumentOption} from '../../utils/add-create-document-option';
// TODO: email template?

export function renderBookmarkNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (!node.getUrl() || node.getUrl().trim() === '') {
        return document.createTextNode('');
    }

    return frontendTemplate(node, document);
}

function frontendTemplate(node, document) {
    const card = document.createElement('figure');
    const caption = node.getCaption();
    let cardClass = 'kg-card kg-bookmark-card';
    if (caption) {
        cardClass += ' kg-card-hascaption';
    }
    card.setAttribute('class', cardClass);

    const container = document.createElement('a');
    container.setAttribute('class','kg-bookmark-container');
    container.href = node.getUrl();
    card.appendChild(container);

    const content = document.createElement('div');
    content.setAttribute('class','kg-bookmark-content');
    container.appendChild(content);

    const title = document.createElement('div');
    title.setAttribute('class','kg-bookmark-title');
    title.textContent = node.getTitle();
    content.appendChild(title);

    const description = document.createElement('div');
    description.setAttribute('class','kg-bookmark-description');
    description.textContent = node.getDescription();
    content.appendChild(description);

    const metadata = document.createElement('div');
    metadata.setAttribute('class','kg-bookmark-metadata');
    content.appendChild(metadata);

    metadata.icon = node.getIcon();
    if (metadata.icon) {
        const icon = document.createElement('img');
        icon.setAttribute('class','kg-bookmark-icon');
        icon.src = metadata.icon;
        icon.alt = '';
        metadata.appendChild(icon);
    }

    metadata.author = node.getAuthor();
    if (metadata.author) {
        const author = document.createElement('span');
        author.setAttribute('class','kg-bookmark-author');
        author.textContent = metadata.author;
        metadata.appendChild(author);
    }

    metadata.publisher = node.getPublisher();
    if (metadata.publisher) {
        const publisher = document.createElement('span');
        publisher.setAttribute('class','kg-bookmark-publisher');
        publisher.textContent = metadata.publisher;
        metadata.appendChild(publisher);
    }

    metadata.thumbnail = node.getThumbnail();
    if (metadata.thumbnail) {
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.setAttribute('class','kg-bookmark-thumbnail');
        container.appendChild(thumbnailDiv);

        const thumbnail = document.createElement('img');
        thumbnail.src = metadata.thumbnail;
        thumbnail.alt = '';
        thumbnailDiv.appendChild(thumbnail);
    }

    if (caption) {
        const figCaption = document.createElement('figcaption');
        figCaption.textContent = caption;
        card.appendChild(figCaption);
    }

    return card;
}
