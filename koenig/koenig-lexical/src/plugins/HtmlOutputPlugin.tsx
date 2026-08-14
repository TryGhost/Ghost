import React from 'react';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$getRoot, $insertNodes} from 'lexical';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

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

            // There are few recent issues related to $generateNodesFromDOM
            // https://github.com/facebook/lexical/issues/2807
            // As a temporary fix, checking node content to remove additional spaces and br
            const filteredNodes = nodes.filter(n => n.getTextContent().trim());

            // Select the root
            $getRoot().select();
            $getRoot().clear();

            // Insert them at a selection.
            $insertNodes(filteredNodes);
        });
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onChange = React.useCallback(() => {
        editor.update(() => {
            const htmlString = $generateHtmlFromNodes(editor, null);
            // htmlString will be an empty paragraph with line break if a caption is set and removed
            const captionText = new DOMParser().parseFromString(htmlString, 'text/html').documentElement.textContent;
            if (captionText) {
                setHtml?.(htmlString);
            } else {
                setHtml('');
            }
        });
    }, [editor, setHtml]);

    return (
        <OnChangePlugin onChange={onChange}/>
    );
};

export default HtmlOutputPlugin;
