import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions, ExportDOMOutput} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';

type ArtifactNodeData = {
    id: string;
    artifactVersion: number;
    title: string;
    description: string;
    html: string;
};

function serializePayload(node: ArtifactNodeData): string {
    return JSON.stringify({
        id: node.id,
        version: node.artifactVersion,
        title: node.title,
        description: node.description,
        html: node.html
    })
        .replaceAll('<', '\\u003c')
        .replaceAll('\u2028', '\\u2028')
        .replaceAll('\u2029', '\\u2029');
}

export function renderArtifactNode(node: ArtifactNodeData, options: ExportDOMOptions = {}): ExportDOMOutput {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    if (!node.html) {
        return renderEmptyContainer(document);
    }

    if (options.target === 'email') {
        const fallback = document.createElement('div');
        fallback.className = 'kg-card kg-artifact-card kg-artifact-card-fallback';

        const title = document.createElement('strong');
        title.textContent = node.title;
        fallback.append(title);

        if (node.description) {
            const description = document.createElement('p');
            description.textContent = node.description;
            fallback.append(description);
        }

        const link = document.createElement('a');
        const postUrl = (options.postUrl ?? '').split('#')[0];
        link.href = `${postUrl}#artifact-${node.id}`;
        link.textContent = 'Open in browser';
        fallback.append(link);

        return {element: fallback, type: 'outer'};
    }

    const element = document.createElement('figure');
    element.className = 'kg-card kg-artifact-card';
    element.id = `artifact-${node.id}`;
    element.dataset.artifactId = node.id;
    element.dataset.artifactTitle = node.title;

    const payload = document.createElement('script');
    payload.type = 'application/json';
    payload.className = 'kg-artifact-card-data';
    payload.textContent = serializePayload(node);
    element.append(payload);

    return {element, type: 'outer'};
}
