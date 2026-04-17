import {JSDOM} from 'jsdom';
import './overrides.js';
import './assertions.js';
import Prettier from '@prettier/sync';

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

const parser = new dom.window.DOMParser();
export function createDocument(htmlString: string) {
    return parser.parseFromString(htmlString, 'text/html');
}
