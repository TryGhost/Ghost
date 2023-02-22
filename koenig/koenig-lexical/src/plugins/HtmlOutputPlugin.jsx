import React from 'react';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {$generateNodesFromDOM, $generateHtmlFromNodes} from '@lexical/html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getRoot, $insertNodes} from 'lexical';

export const HtmlOutputPlugin = ({html = '', setHtml}) => {
    const [editor] = useLexicalComposerContext();
    const isFirstRender = React.useRef(true);

    React.useLayoutEffect(() => {
        if (!isFirstRender.current) {
            return;
        }

        isFirstRender.current = false;

        if (!html) {
            return;
        }

        editor.update(() => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(html, 'text/html');

            const nodes = $generateNodesFromDOM(editor, dom);

            let isEmpty = true;
            nodes.forEach((node) => {
                // There are few recent issues related to $generateNodesFromDOM
                // https://github.com/facebook/lexical/issues/2807
                // https://github.com/facebook/lexical/issues/3677
                // As a temporary fix, checking node content to remove additional spaces and br
                if (node.getTextContent().trim()) {
                    isEmpty = false;
                }
            });

            // Select the root
            $getRoot().select();

            if (isEmpty) {
                $getRoot().clear();
                return;
            }

            // Insert them at a selection.
            $insertNodes(nodes);
        });
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onChange = React.useCallback(() => {
        editor.update(() => {
            const htmlString = $generateHtmlFromNodes(editor, null);
            setHtml?.(htmlString);
        });
    }, [editor, setHtml]);

    return (
        <OnChangePlugin onChange={onChange}/>
    );
};

export default HtmlOutputPlugin;
