import '../styles/index.css';
import KoenigComposableEditor from './KoenigComposableEditor';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';
import {SharedHistoryContext} from '../context/SharedHistoryContext';
import {SharedOnChangeContext} from '../context/SharedOnChangeContext';
import type {KoenigComposableEditorProps} from './KoenigComposableEditor';
import type {SerializedEditorState} from 'lexical';

export interface KoenigEditorProps extends Omit<KoenigComposableEditorProps, 'onChange'> {
    onChange?: (serializedState: SerializedEditorState) => void;
    children?: React.ReactNode;
}

const KoenigEditor = ({
    onChange,
    children,
    ...props
}: KoenigEditorProps) => {
    return (
        <SharedHistoryContext>
            <SharedOnChangeContext onChange={onChange}>
                <KoenigComposableEditor {...props}>
                    <AllDefaultPlugins />
                    {children}
                </KoenigComposableEditor>
            </SharedOnChangeContext>
        </SharedHistoryContext>
    );
};

export default KoenigEditor;
