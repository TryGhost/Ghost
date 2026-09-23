import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {escapeHtml} from '../../utils/escape-html.js';
import {html} from '../../utils/tagged-template-fns.js';

// Stub: the Podcasts app is not backed by a real service yet. The renderer
// emits a static episode card so posts containing the card still render.
export interface PodcastNodeData {
    podcastTitle?: string;
    title?: string;
    description?: string;
    episodeUrl?: string;
    duration?: string;
    artworkUrl?: string;
}

interface PodcastRenderOptions extends ExportDOMOptions {}

function frontendTemplate(node: PodcastNodeData) {
    const title = escapeHtml(node.title || 'Podcast episode');
    const artwork = node.artworkUrl
        ? html`<img class="kg-podcast-artwork" src="${escapeHtml(node.artworkUrl)}" alt="" />`
        : '';
    const podcastTitle = node.podcastTitle
        ? html`<div class="kg-podcast-show">${escapeHtml(node.podcastTitle)}</div>`
        : '';
    const description = node.description
        ? html`<p class="kg-podcast-description">${escapeHtml(node.description)}</p>`
        : '';
    const duration = node.duration
        ? html`<div class="kg-podcast-duration">${escapeHtml(node.duration)}</div>`
        : '';
    const player = node.episodeUrl
        ? html`<audio class="kg-podcast-player" controls preload="metadata" src="${escapeHtml(node.episodeUrl)}"></audio>`
        : '';

    return html`
        <figure class="kg-card kg-podcast-card">
            ${artwork}
            <div class="kg-podcast-content">
                ${podcastTitle}
                <div class="kg-podcast-title">${title}</div>
                ${description}
                ${duration}
                ${player}
            </div>
        </figure>
    `;
}

function emailTemplate(node: PodcastNodeData) {
    const title = escapeHtml(node.title || 'Podcast episode');
    const podcastTitle = node.podcastTitle
        ? html`<p class="kg-podcast-show">${escapeHtml(node.podcastTitle)}</p>`
        : '';
    const link = node.episodeUrl
        ? html`<a href="${escapeHtml(node.episodeUrl)}">Listen to the episode</a>`
        : '';

    return html`
        <table class="kg-card kg-podcast-card" role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
            <tbody>
                <tr>
                    <td>
                        ${podcastTitle}
                        <p class="kg-podcast-title"><strong>${title}</strong></p>
                        ${link}
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

export function renderPodcastNode(node: PodcastNodeData, options: PodcastRenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const renderedHtml = options.target === 'email' ? emailTemplate(node) : frontendTemplate(node);

    const element = document.createElement('div');
    element.innerHTML = renderedHtml;
    return {element, type: 'inner' as const};
}
