import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderFileNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);
  
    const document = options.createDocument();
  
    if (!node.getSrc() || node.getSrc().trim() === '') {
        return document.createTextNode('');
    }
  
    const card = document.createElement('div');
    card.setAttribute('class', 'kg-card kg-file-card');
  
    const container = document.createElement('a');
    container.setAttribute('class', 'kg-file-card-container');
    container.setAttribute('href', node.getSrc());
    container.setAttribute('title', 'Download');
    container.setAttribute('download', '');
  
    const contents = document.createElement('div');
    contents.setAttribute('class', 'kg-file-card-contents');
  
    const title = document.createElement('div');
    title.setAttribute('class', 'kg-file-card-title');
    title.textContent = node.getTitle() || '';
  
    const caption = document.createElement('div');
    caption.setAttribute('class', 'kg-file-card-caption');
    caption.textContent = node.getDescription() || '';
  
    const metadata = document.createElement('div');
    metadata.setAttribute('class', 'kg-file-card-metadata');
  
    const filename = document.createElement('div');
    filename.setAttribute('class', 'kg-file-card-filename');
    filename.textContent = node.getFileName() || '';
  
    const filesize = document.createElement('div');
    filesize.setAttribute('class', 'kg-file-card-filesize');
    filesize.textContent = node.getFileSize() || '';
  
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
  
    return card;
}
