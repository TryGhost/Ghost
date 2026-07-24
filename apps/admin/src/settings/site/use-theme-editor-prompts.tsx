import { useCallback, useMemo, useState } from "react";

import {
    ThemeEditorConfirmDialog,
    type ThemeEditorConfirmProps,
    type ThemeEditorConfirmState,
    ThemeEditorInputDialog,
    type ThemeEditorInputProps,
    type ThemeEditorInputState,
} from "./theme-editor-dialogs";

/** Promise-based confirm/input prompts for the theme code editor; render `dialogs` inside the editor. */
export function useThemeEditorPrompts() {
    const [confirmState, setConfirmState] = useState<ThemeEditorConfirmState | null>(null);
    const [inputState, setInputState] = useState<ThemeEditorInputState | null>(null);

    const requestConfirmation = useCallback((props: ThemeEditorConfirmProps): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({
                ...props,
                resolve: (result) => {
                    setConfirmState(null);
                    resolve(result);
                },
            });
        });
    }, []);

    const requestInput = useCallback((props: ThemeEditorInputProps): Promise<string | null> => {
        return new Promise((resolve) => {
            setInputState({
                ...props,
                resolve: (result) => {
                    setInputState(null);
                    resolve(result);
                },
            });
        });
    }, []);

    const dialogs = useMemo(() => (
        <>
            {confirmState && <ThemeEditorConfirmDialog state={confirmState} />}
            {inputState && <ThemeEditorInputDialog key={inputState.title + inputState.initialValue} state={inputState} />}
        </>
    ), [confirmState, inputState]);

    return { requestConfirmation, requestInput, dialogs };
}
