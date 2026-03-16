import type {Builder, ParserPlugin, ParserPluginOptions, PluginOptions} from '../types.js';
import {addFigCaptionToPayload, readImageAttributesFromNode} from '../helpers.js';

export function fromImg(): ParserPlugin {
    return function imgToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'IMG') {
            return;
        }

        const payload = readImageAttributesFromNode(node as HTMLImageElement);
        const cardSection = builder.createCardSection('image', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromFigure(options: ParserPluginOptions): ParserPlugin {
    return function figureImgToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'FIGURE') {
            return;
        }

        const el = node as Element;
        const img = el.querySelector('img') as HTMLImageElement | null;
        const kgClass = el.className.match(/kg-width-(wide|full)/);
        const grafClass = el.className.match(/graf--layout(FillWidth|OutsetCenter)/);

        if (!img) {
            return;
        }

        const payload = readImageAttributesFromNode(img);

        if (kgClass) {
            payload.cardWidth = kgClass[1];
        } else if (grafClass) {
            payload.cardWidth = grafClass[1] === 'FillWidth' ? 'full' : 'wide';
        }

        addFigCaptionToPayload(el, payload, {options});

        const cardSection = builder.createCardSection('image', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
