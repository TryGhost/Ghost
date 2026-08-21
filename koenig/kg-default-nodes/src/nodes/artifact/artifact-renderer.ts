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

const ARTIFACT_HTML_MAX_BYTES = 5 * 1024 * 1024;

function validArtifact(node: ArtifactNodeData): boolean {
    if (typeof node.id !== 'string'
        || !node.id.trim()
        || node.id.length > 256
        || node.artifactVersion !== 1
        || typeof node.title !== 'string'
        || node.title.length > 200
        || typeof node.description !== 'string'
        || node.description.length > 500
        || typeof node.html !== 'string'
        || node.html.length > ARTIFACT_HTML_MAX_BYTES) {
        return false;
    }

    if (new TextEncoder().encode(node.html).byteLength > ARTIFACT_HTML_MAX_BYTES) {
        return false;
    }

    return /^\s*<!doctype\s+html\b/i.test(node.html)
        && /<html\b/i.test(node.html)
        && /<head\b/i.test(node.html)
        && /<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title\s*>/i.test(node.html)
        && /<body\b/i.test(node.html);
}

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

    if (!validArtifact(node)) {
        const invalid = document.createElement('figure');
        invalid.className = 'kg-card kg-artifact-card';

        const fallback = document.createElement('div');
        fallback.className = 'kg-artifact-card-fallback';
        fallback.textContent = 'This embed couldn’t load';
        invalid.append(fallback);

        return {element: invalid, type: 'outer'};
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

    const fallback = document.createElement('div');
    fallback.className = 'kg-artifact-card-fallback';
    fallback.setAttribute('aria-live', 'polite');

    const title = document.createElement('strong');
    title.className = 'kg-artifact-card-title';
    title.textContent = node.title;
    fallback.append(title);

    if (node.description) {
        const description = document.createElement('p');
        description.className = 'kg-artifact-card-description';
        description.textContent = node.description;
        fallback.append(description);
    }

    element.append(fallback);

    const payload = document.createElement('script');
    payload.type = 'application/json';
    payload.className = 'kg-artifact-card-data';
    payload.textContent = serializePayload(node);
    element.append(payload);

    return {element, type: 'outer'};
}
