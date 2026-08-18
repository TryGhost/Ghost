import type {PostImportRow} from './row';

const {slugify} = require('@tryghost/string');

export type HtmlToLexical = (html: string) => unknown;

// The values handed to models.Post.add. Content is lexical only: under
// options.importing the model strips client-supplied html and regenerates it from
// lexical on save, so the CSV's html must be converted, never passed through.
export interface PostData {
    title: string;
    slug: string;
    lexical?: string;
    published_at?: string;
    created_at?: string;
    updated_at?: string;
}

export default function buildPostData(row: PostImportRow, htmlToLexical: HtmlToLexical): PostData {
    const data: PostData = {
        title: row.title,
        // Slugified here with the standard rules: left to the model, the
        // importing-context slug pass keeps every punctuation dash
        // (slugify requiredChangesOnly).
        slug: slugify(row.title)
    };

    if (row.html) {
        data.lexical = JSON.stringify(htmlToLexical(row.html));
    }

    // The one date column dates the whole post; preserved only because the write runs
    // under options.importing, which stops the model stamping its own timestamps.
    if (row.published_at) {
        data.published_at = row.published_at;
        data.created_at = row.published_at;
        data.updated_at = row.published_at;
    }

    return data;
}
