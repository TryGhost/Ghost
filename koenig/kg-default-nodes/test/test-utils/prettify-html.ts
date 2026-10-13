import Prettier from '@prettier/sync';
import {minify} from './minify-html.js';

export function prettifyHTML(html: string): string {
    const minified = minify(html, {collapseWhitespace: true, collapseInlineTagWhitespace: true});
    // Renderer comparisons ignore layout whitespace around inline elements.
    const prettified = Prettier.format(minified, {parser: 'html', htmlWhitespaceSensitivity: 'ignore'});

    return prettified;
}
