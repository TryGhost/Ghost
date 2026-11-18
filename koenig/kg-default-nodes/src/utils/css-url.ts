import {decodeHTMLStrict} from 'entities';

/**
 * Write a URL as a CSS `url('…')` for a declaration inside a double-quoted HTML attribute.
 *
 * The quotes are part of the result so every caller gets the quoted form, where brackets are
 * ordinary characters and a URL containing them is written unchanged. The characters that
 * can't appear inside the CSS string are percent-encoded, as a browser encodes most of them
 * when it requests the URL: quotes, backslash, whitespace and control characters. Then `&`,
 * `<` and `>` are escaped for the attribute.
 *
 * Percent-encoding rather than CSS escapes (`\'`), because the result is also read by email
 * clients, which fetch a percent-encoded URL as it stands.
 */
export function cssUrl(url: string | null | undefined) {
    // Entities are decoded first, so a URL stored with them isn't escaped twice (see escapeHtml).
    // The whitespace a URL parser drops is dropped here too, rather than encoded into the path.
    const encoded = decodeHTMLStrict(String(url ?? ''))
        // eslint-disable-next-line no-control-regex
        .replace(/^[\u0000- ]+|[\u0000- ]+$/g, '')
        .replace(/[\t\n\r]/g, '')
        // eslint-disable-next-line no-control-regex
        .replace(/["'\\\s\u0000-\u001f\u007f]/g, char => (char === '\'' ? '%27' : encodeURIComponent(char)))
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return `url('${encoded}')`;
}
