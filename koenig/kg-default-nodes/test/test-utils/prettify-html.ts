import Prettier from 'prettier';
import {minify} from 'html-minifier-next';

export async function prettifyHTML(html: string): Promise<string> {
    const minified = await minify(html, {collapseWhitespace: true, collapseInlineTagWhitespace: true});
    // Renderer comparisons ignore layout whitespace around inline elements.
    const prettified = await Prettier.format(minified, {parser: 'html', htmlWhitespaceSensitivity: 'ignore'});

    return prettified;
}
