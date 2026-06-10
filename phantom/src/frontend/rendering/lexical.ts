import {createRequire} from 'node:module';

// The kg packages' ESM builds don't load under native ESM resolution
// (extensionless lodash imports, CJS-only `lexical` named exports), so
// consume the CJS builds the same way ghost/core does.
const require = createRequire(import.meta.url);
const {DEFAULT_NODES} = require('@tryghost/kg-default-nodes');
const {LexicalHTMLRenderer} = require('@tryghost/kg-lexical-html-renderer');

const renderer = new LexicalHTMLRenderer({nodes: DEFAULT_NODES});

export const renderLexicalHtml = async (lexical: Record<string, unknown>) => {
    return renderer.render(lexical as never, {
        feature: {
            contentVisibility: false,
            emailCustomization: true,
            emailUniqueid: false
        }
    } as never);
};
