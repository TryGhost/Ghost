import '../styles/index.css';
import HorizontalRulePlugin from '../plugins/HorizontalRulePlugin';
import KoenigComposableEditor from './KoenigComposableEditor';
import React from 'react';
import ReplacementStringsPlugin from '../plugins/ReplacementStringsPlugin';
import {EMAIL_TRANSFORMERS} from '../plugins/MarkdownShortcutPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';

const KoenigEmailEditor = ({
    children,
    ...props
}) => {
    return (
        <KoenigComposableEditor
            isSnippetsEnabled={false}
            markdownTransformers={EMAIL_TRANSFORMERS}
            {...props}
        >
            <ListPlugin />
            <ReplacementStringsPlugin />
            <HorizontalRulePlugin />
            {children}
        </KoenigComposableEditor>
    );
};

export default KoenigEmailEditor;
