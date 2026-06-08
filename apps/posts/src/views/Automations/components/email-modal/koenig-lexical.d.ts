// @tryghost/koenig-lexical ships no type declarations. We load it dynamically
// and only use its self-contained EmailEditor, so declare just that surface.
declare module '@tryghost/koenig-lexical' {
    import type {ComponentType} from 'react';

    export interface EmailEditorProps {
        cardConfig?: unknown;
        className?: string;
        darkMode?: boolean;
        fileUploader?: unknown;
        initialEditorState?: string;
        placeholderText?: string;
        registerAPI?: (api: unknown) => void;
        onChange?: (state: unknown) => void;
    }

    export const EmailEditor: ComponentType<EmailEditorProps>;
}
