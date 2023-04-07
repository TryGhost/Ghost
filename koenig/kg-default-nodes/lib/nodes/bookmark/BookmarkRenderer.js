import {addCreateDocumentOption} from '../../utils/add-create-document-option';
// TODO: email template?

export function renderBookmarkNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (!node.getUrl() || node.getUrl().trim() === '') {
        return document.createTextNode('');
    }

    if (options.target === 'email') {
        return emailTemplate(node);
    } else {
        return frontendTemplate(node, document);
    }
}

function emailTemplate(node) {
    const title = node.getTitle();
    const publisher = node.getPublisher();
    const author = node.getAuthor();
    const icon = node.getIcon();
    const description = node.getDescription();
    const url = node.getUrl();

    return (
        `<!--[if vml]>
            <table class="kg-card kg-bookmark-card--outlook" style="margin: 0; padding: 0; width: 100%; border: 1px solid #e5eff5; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; border-collapse: collapse; border-spacing: 0;" width="100%">
                <tr>
                    <td width="100%" style="padding: 20px;">
                        <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                            <tr>
                                <td class="kg-bookmark-title--outlook">
                                    <a href="${url}" style="text-decoration: none; color: #15212A; font-size: 15px; line-height: 1.5em; font-weight: 600;">
                                        ${title}
                                    </a>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div class="kg-bookmark-description--outlook">
                                        <a href="${url}" style="text-decoration: none; margin-top: 12px; color: #738a94; font-size: 13px; line-height: 1.5em; font-weight: 400;">
                                            ${description}
                                        </a>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td class="kg-bookmark-metadata--outlook" style="padding-top: 14px; color: #15212A; font-size: 13px; font-weight: 400; line-height: 1.5em;">
                                    <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                                        <tr>
                                            ${icon ? `
                                                <td valign="middle" class="kg-bookmark-icon--outlook" style="padding-right: 8px; font-size: 0; line-height: 1.5em;">
                                                    <a href="${url}" style="text-decoration: none; color: #15212A;">
                                                        <img src="${icon}" width="22" height="22" alt=" ">
                                                    </a>
                                                </td>
                                            ` : ''}
                                            <td valign="middle" class="kg-bookmark-byline--outlook">
                                                <a href="${url}" style="text-decoration: none; color: #15212A;">
                                                    ${publisher}
                                                    ${author ? `&nbsp;&#x2022;&nbsp;` : ''}
                                                    ${author}
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <div class="kg-bookmark-spacer--outlook" style="height: 1.5em;">&nbsp;</div>
        <![endif]-->`
    );
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
