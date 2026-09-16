import Prettier from '@prettier/sync';
import {minify} from 'html-minifier';

export function prettifyHTML(html: string): string {
    const minified = minify(html, {collapseWhitespace: true, collapseInlineTagWhitespace: true});
    const prettified = Prettier.format(minified, {parser: 'html'});

    return prettified;
}
