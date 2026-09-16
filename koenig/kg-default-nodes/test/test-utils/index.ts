import {JSDOM} from 'jsdom';
import Prettier from '@prettier/sync';
import {buildCallRenderer} from './build-call-renderer.js';

export {assertPrettifiedIncludes} from './assert-prettified-includes.js';
export {assertPrettifiesTo} from './assert-prettifies-to.js';
export {prettifyHTML} from './prettify-html.js';
export * as visibility from './visibility.js';

export function html(partials: TemplateStringsArray, ...params: unknown[]) {
    let output = '';
    for (let i = 0; i < partials.length; i++) {
        output += partials[i];
        if (i < partials.length - 1) {
            output += params[i];
        }
    }

    return Prettier.format(output, {parser: 'html'});
}

export const dom = new JSDOM();
export const callRenderer = buildCallRenderer(dom);

const parser = new dom.window.DOMParser();
export function createDocument(htmlString: string) {
    return parser.parseFromString(htmlString, 'text/html');
}
