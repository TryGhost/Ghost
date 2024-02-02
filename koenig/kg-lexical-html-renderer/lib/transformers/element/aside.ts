// TODO: update this to an import once we move kg-default-nodes to typescript
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {$isAsideNode} = require('@tryghost/kg-default-nodes');
import type {LexicalNode} from 'lexical';
import type {ExportChildren} from '..';
import type {RendererOptions} from '../../convert-to-html-string';

module.exports = {
    export(node: LexicalNode, options: RendererOptions, exportChildren: ExportChildren) {
        if (!$isAsideNode(node)) {
            return null;
        }

        return `<blockquote class="kg-blockquote-alt">${exportChildren(node)}</blockquote>`;
    }
};
