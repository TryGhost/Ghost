import KoenigNestedEditor from '../../KoenigNestedEditor';
import ReplacementStringsPlugin from '../../../plugins/ReplacementStringsPlugin';
import {CardVisibilityMessage} from '../CardVisibilityMessage';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import type {LexicalEditor} from 'lexical';

interface EmailCardProps {
    htmlEditor: LexicalEditor;
    htmlEditorInitialState?: string;
    isEditing?: boolean;
}

export function EmailCard({
    htmlEditor,
    htmlEditorInitialState,
    isEditing = false
}: EmailCardProps) {
    return (
        <>
            <CardVisibilityMessage message="Hidden on website" />
            <div className="w-full">
                <KoenigNestedEditor
                    autoFocus={true}
                    initialEditor={htmlEditor}
                    initialEditorState={htmlEditorInitialState}
                    nodes='basic'
                    textClassName='kg-email-html whitespace-normal pb-1'
                >
                    <ReplacementStringsPlugin />
                </KoenigNestedEditor>

                {!isEditing && <ReadOnlyOverlay />}
            </div>
        </>
    );
}
