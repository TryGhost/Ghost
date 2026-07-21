import {$createRangeSelection, $getSelection, $isRangeSelection, $setSelection} from 'lexical';
import {LinkInput} from './LinkInput';
import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

interface LinkActionToolbarProps {
    href?: string;
    onClose: () => void;
    [key: string]: unknown;
}

export function LinkActionToolbar({href, onClose, ...props}: LinkActionToolbarProps) {
    const [editor] = useLexicalComposerContext();

    const onLinkUpdate = (updatedHref: string) => {
        editor.update(() => {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, updatedHref || null);
            // remove selection to avoid format menu popup
            const selection = $getSelection();
            if (selection && $isRangeSelection(selection)) {
                const focusNode = selection.focus.getNode();
                const rangeSelection = $createRangeSelection();
                rangeSelection.setTextNodeRange(focusNode, focusNode.getTextContentSize(), focusNode, focusNode.getTextContentSize());
                $setSelection(rangeSelection);
            }
            onClose();
        });
    };
    return (
        <LinkInput
            cancel={onClose}
            href={href}
            update={onLinkUpdate}
            {...props}
        />
    );
}
