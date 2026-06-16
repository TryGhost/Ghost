const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');
const getPluginLoader = require('../../card-plugins/loader');

function escapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Prefixes CSS selectors with a namespace to prevent collisions between plugins.
 */
function scopeCss(css, namespace) {
    if (!css || !namespace) return css;
    // Strip comments before processing so /* ... */ isn't treated as a selector
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Prefix each non-@rule selector with the namespace
    return stripped.replace(/([^}]*?)\{/g, (match, selectors) => {
        const trimmed = selectors.trim();
        if (!trimmed || trimmed.startsWith('@')) return match;
        if (trimmed.includes(`.${namespace}`)) return match;
        const scoped = selectors.split(',').map(s => {
            const t = s.trim();
            if (!t || t.startsWith(':')) return s;
            return `.${namespace} ${t}`;
        }).join(',\n');
        return scoped + ' {';
    });
}

/**
 * Parses the raw payload (object or JSON string) into a data object.
 * The renderTemplate engine handles string→array conversion for #each,
 * so no plugin-specific preprocessing is needed here.
 */
function parsePayload(raw) {
    if (typeof raw === 'object' && raw !== null) {
        return raw;
    }
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw || '{}');
        } catch {
            try {
                return JSON.parse((raw || '{}').replace(/\\"/g, '"'));
            } catch {
                return {};
            }
        }
    }
    return {};
}

/**
 * Adds data-ghost-* attributes to the root HTML element for re-import.
 */
function addDataAttributes(html, pluginName, cardName, payload) {
    const payloadStr = JSON.stringify(payload)
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const tagMatch = html.match(/<(\w+)([^>]*)>/);
    if (tagMatch) {
        const tagName = tagMatch[1];
        const existingAttrs = tagMatch[2] || '';
        const escapedPlugin = escapeAttr(pluginName);
        const escapedCard = escapeAttr(cardName);
        const dataAttrs = ` data-ghost-plugin="${escapedPlugin}" data-card-name="${escapedCard}" data-ghost-payload='${payloadStr}'`;
        return html.replace(
            new RegExp(`<${tagName}([^>]*)>`),
            `<${tagName}${existingAttrs}${dataAttrs}>`
        );
    }

    return html;
}

/**
 * Server-side renderer for plugin-card nodes.
 *
 * Uses the plugin's Handlebars template (from plugin-loader) to render the
 * card HTML from the payload. Falls back to pre-rendered node.html if the
 * template is unavailable (e.g. plugin was deleted).
 */
function renderPluginNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    // Fetch CSS from plugin loader if not stored on the node
    let css = node.css || '';
    let template = node.template || '';
    let card = null;

    if (node.pluginName && node.cardName) {
        try {
            const loader = getPluginLoader();
            card = loader.getCard(node.pluginName, node.cardName);
            if (card) {
                // Always use the latest from the plugin loader so
                // CSS/template updates take effect without re-saving
                if (card.css) {
                    css = card.css;
                }
                if (card.template) {
                    template = card.template;
                }
            }
        } catch (err) {
            // Graceful degradation
        }
    }

    // Keep raw payload for re-import via data attributes
    const rawPayload = parsePayload(node.payload || '{}');

    // Apply plugin-specific data transformations before rendering
    // Deep copy so nested mutations in preprocess don't corrupt rawPayload
    let renderPayload;
    try {
        renderPayload = JSON.parse(JSON.stringify(rawPayload));
    } catch {
        renderPayload = {...rawPayload}; // Fallback to shallow copy
    }
    const preprocessSource = card?.preprocess || '';
    if (preprocessSource) {
        try {
            const {createPreprocessor} = require('@tryghost/kg-default-nodes');
            const preprocess = createPreprocessor(preprocessSource);
            if (preprocess) {
                renderPayload = preprocess(renderPayload);
            }
        } catch (err) {
            // If preprocess fails, continue with raw payload
        }
    }

    // Render the card HTML from the template + payload.
    // Uses the same renderTemplate engine as the client-side editor
    // so both render identically and handle the same template syntax.
    let renderedHtml;

    if (template) {
        try {
            const {renderTemplate} = require('@tryghost/kg-default-nodes');
            renderedHtml = renderTemplate(template, renderPayload);
        } catch (err) {
            renderedHtml = node.html || `<div class="plugin-card-error">Render error: ${err.message}</div>`;
        }
    } else if (node.html) {
        renderedHtml = node.html;
    } else {
        renderedHtml = '<div class="plugin-card-empty">Plugin card (no template)</div>';
    }

    // Wrap in namespace container so scoped CSS applies
    const namespace = `plugin-${node.pluginName || 'unknown'}`;
    renderedHtml = `<div class="${namespace}">\n${renderedHtml}\n</div>`;

    // Add data attributes for re-import via plugin-card-parser.
    // Store the RAW payload so the editor form gets the original data.
    renderedHtml = addDataAttributes(
        renderedHtml,
        node.pluginName || '',
        node.cardName || '',
        rawPayload
    );

    const scopedCss = scopeCss(css, namespace);
    const styleTag = scopedCss ? `<style>${scopedCss}</style>` : '';
    const wrappedHtml = `\n<!--kg-card-begin: plugin-card-->\n${styleTag}${renderedHtml}\n<!--kg-card-end: plugin-card-->\n`;

    const textarea = document.createElement('textarea');
    textarea.value = wrappedHtml;

    return {element: textarea, type: 'value'};
}

module.exports = renderPluginNode;
