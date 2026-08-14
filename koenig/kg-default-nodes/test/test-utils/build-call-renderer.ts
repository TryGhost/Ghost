import {renderAudioNode} from '../../src/nodes/audio/audio-renderer.js';
import {renderBookmarkNode} from '../../src/nodes/bookmark/bookmark-renderer.js';
import {renderButtonNode} from '../../src/nodes/button/button-renderer.js';
import {renderCalloutNode} from '../../src/nodes/callout/callout-renderer.js';
import {renderCallToActionNode} from '../../src/nodes/call-to-action/calltoaction-renderer.js';
import {renderCodeBlockNode} from '../../src/nodes/codeblock/codeblock-renderer.js';
import {renderEmailCtaNode} from '../../src/nodes/email-cta/email-cta-renderer.js';
import {renderEmailNode} from '../../src/nodes/email/email-renderer.js';
import {renderEmbedNode} from '../../src/nodes/embed/embed-renderer.js';
import {renderFileNode} from '../../src/nodes/file/file-renderer.js';
import {renderGalleryNode} from '../../src/nodes/gallery/gallery-renderer.js';
import {renderHeaderNodeV1} from '../../src/nodes/header/renderers/v1/header-renderer.js';
import {renderHeaderNodeV2} from '../../src/nodes/header/renderers/v2/header-renderer.js';
import {renderHorizontalRuleNode} from '../../src/nodes/horizontalrule/horizontalrule-renderer.js';
import {renderHtmlNode} from '../../src/nodes/html/html-renderer.js';
import {renderImageNode} from '../../src/nodes/image/image-renderer.js';
import {renderMarkdownNode} from '../../src/nodes/markdown/markdown-renderer.js';
import {renderPaywallNode} from '../../src/nodes/paywall/paywall-renderer.js';
import {renderProductNode} from '../../src/nodes/product/product-renderer.js';
import {renderSignupCardToDOM} from '../../src/nodes/signup/signup-renderer.js';
import {renderToggleNode} from '../../src/nodes/toggle/toggle-renderer.js';
import {renderTransistorNode} from '../../src/nodes/transistor/transistor-renderer.js';
import {renderVideoNode} from '../../src/nodes/video/video-renderer.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type RendererFn = (node: any, options: any) => {element: any; type?: string};

const nodeRenderers: Record<string, RendererFn | Record<number, RendererFn>> = {
    audio: renderAudioNode,
    bookmark: renderBookmarkNode,
    button: renderButtonNode,
    callout: renderCalloutNode,
    'call-to-action': renderCallToActionNode,
    codeblock: renderCodeBlockNode,
    'email-cta': renderEmailCtaNode,
    email: renderEmailNode,
    embed: renderEmbedNode,
    file: renderFileNode,
    gallery: renderGalleryNode,
    header: {
        1: renderHeaderNodeV1,
        2: renderHeaderNodeV2
    },
    horizontalrule: renderHorizontalRuleNode,
    html: renderHtmlNode,
    image: renderImageNode,
    markdown: renderMarkdownNode,
    paywall: renderPaywallNode,
    product: renderProductNode,
    signup: renderSignupCardToDOM,
    toggle: renderToggleNode,
    transistor: renderTransistorNode,
    video: renderVideoNode
};

export function buildCallRenderer(dom: unknown) {
    return function callRenderer(
        nodeType: string,
        data: Record<string, unknown>,
        options: Record<string, unknown> = {}
    ) {
        const renderer = nodeRenderers[nodeType];
        if (!renderer) {
            throw new Error(`Renderer for node type ${nodeType} not found`);
        }

        // duplicate data to __x properties to simulate what's available in real node instances
        data = {
            ...data,
            ...Object.fromEntries(Object.entries(data).map(([key, value]) => [`__${key}`, value]))
        };

        // add other default node properties and methods
        data = {
            isEmpty: () => false,
            getDataset: () => data,
            ...data
        };

        // default options
        options = {
            dom,
            siteUrl: 'https://test.com/',
            postUrl: 'https://test.com/post/',
            imageOptimization: {
                contentImageSizes: {
                    w600: {width: 600},
                    w1000: {width: 1000},
                    w1600: {width: 1600},
                    w2400: {width: 2400}
                }
            },
            canTransformImage: () => true,
            canTransformImageToFormat: () => true,
            ...options
        };

        let result;
        if (typeof renderer === 'object') {
            // support for versioned node renderers
            if (!data.version) {
                throw new Error('version data property is required for versioned node renderers');
            }

            result = renderer[data.version as number](data, options);
        } else {
            result = renderer(data, options);
        }

        let html;
        if (result.type === 'inner') {
            html = result.element.innerHTML;
        } else if (result.type === 'value') {
            html = (result.element as HTMLInputElement).value;
        } else {
            html = result.element.outerHTML;
        }

        return {
            element: result.element,
            type: result.type,
            html
        };
    };
}
