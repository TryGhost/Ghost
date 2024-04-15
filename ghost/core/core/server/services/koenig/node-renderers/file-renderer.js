import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../utils/render-empty-container';
import {escapeHtml} from '../../utils/escape-html';
import {bytesToSize} from '../../utils/size-byte-converter';

export function renderFileNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    if (!node.src || node.src.trim() === '') {
        return renderEmptyContainer(document);
    }

    if (options.target === 'email') {
        return emailTemplate(node, document, options);
    } else {
        return cardTemplate(node, document);
    }
}

function emailTemplate(node, document, options) {
    let iconCls;
    if (!node.fileTitle && !node.fileCaption) {
        iconCls = 'margin-top: 6px; height: 20px; width: 20px; max-width: 20px; padding-top: 4px; padding-bottom: 4px;';
    } else {
        iconCls = 'margin-top: 6px; height: 24px; width: 24px; max-width: 24px;';
    }

    const html = (`
        <table cellspacing="0" cellpadding="4" border="0" class="kg-file-card" width="100%">
            <tr>
                <td>
                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td valign="middle" style="vertical-align: middle;">
                                ${node.fileTitle ? `
                                <table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td>
                                    <a href="${escapeHtml(options.postUrl)}" class="kg-file-title">${escapeHtml(node.fileTitle)}</a>
                                </td></tr></table>
                                ` : ``}
                                ${node.fileCaption ? `
                                <table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td>
                                    <a href="${escapeHtml(options.postUrl)}" class="kg-file-description">${escapeHtml(node.fileCaption)}</a>
                                </td></tr></table>
                                ` : ``}
                                <table cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td>
                                    <a href="${escapeHtml(options.postUrl)}" class="kg-file-meta"><span class="kg-file-name">${escapeHtml(node.fileName)}</span> &bull; ${bytesToSize(node.fileSize)}</a>
                                </td></tr></table>
                            </td>
                            <td width="80" valign="middle" class="kg-file-thumbnail">
                                <a href="${escapeHtml(options.postUrl)}" style="display: block; top: 0; right: 0; bottom: 0; left: 0;">
                                    <img src="https://static.ghost.org/v4.0.0/images/download-icon-darkmode.png" style="${escapeHtml(iconCls)}">
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `);

    const container = document.createElement('div');
    container.innerHTML = html.trim();

    return {element: container.firstElementChild};
}

function cardTemplate(node, document) {
    const card = document.createElement('div');
    card.setAttribute('class', 'kg-card kg-file-card');

    const container = document.createElement('a');
    container.setAttribute('class', 'kg-file-card-container');
    container.setAttribute('href', node.src);
    container.setAttribute('title', 'Download');
    container.setAttribute('download', '');

    const contents = document.createElement('div');
    contents.setAttribute('class', 'kg-file-card-contents');

    const title = document.createElement('div');
    title.setAttribute('class', 'kg-file-card-title');
    title.textContent = node.fileTitle || '';

    const caption = document.createElement('div');
    caption.setAttribute('class', 'kg-file-card-caption');
    caption.textContent = node.fileCaption || '';

    const metadata = document.createElement('div');
    metadata.setAttribute('class', 'kg-file-card-metadata');

    const filename = document.createElement('div');
    filename.setAttribute('class', 'kg-file-card-filename');
    filename.textContent = node.fileName || '';

    const filesize = document.createElement('div');
    filesize.setAttribute('class', 'kg-file-card-filesize');
    filesize.textContent = node.formattedFileSize || '';

    metadata.appendChild(filename);
    metadata.appendChild(filesize);

    contents.appendChild(title);
    contents.appendChild(caption);
    contents.appendChild(metadata);

    container.appendChild(contents);

    const icon = document.createElement('div');
    icon.setAttribute('class', 'kg-file-card-icon');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = '.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}';

    defs.appendChild(style);

    const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titleElement.textContent = 'download-circle';

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('class', 'a');
    polyline.setAttribute('points', '8.25 14.25 12 18 15.75 14.25');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'a');
    line.setAttribute('x1', '12');
    line.setAttribute('y1', '6.75');
    line.setAttribute('x2', '12');
    line.setAttribute('y2', '18');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'a');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '11.25');

    svg.appendChild(defs);
    svg.appendChild(titleElement);
    svg.appendChild(polyline);
    svg.appendChild(line);
    svg.appendChild(circle);

    icon.appendChild(svg);
    container.appendChild(icon);
    card.appendChild(container);

    return {element: card};
}