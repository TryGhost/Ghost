import {useEffect, useState} from 'react';

/**
 * useInputSelection
 * @description
 * Hook helps to keep cursor position when using controlled input.
 * When to use: It mainly needs if there is an input controlled directly by editor (input value is gotten
 * from editor state). In such cases cursor jumps to the end in response to Delete or other keyboard input.
 *
 * Some related issues:
 * https://github.com/facebook/react/issues/14904
 * https://github.com/AnyVisionltd/anv-ui-components/pull/201/files
 * https://github.com/facebook/lexical/issues/3488
 * https://github.com/facebook/lexical/pull/3491
 */
export default function useInputSelection({value}: {value: string}) {
    const [ref, setRef] = useState<HTMLInputElement | null>(null);
    const [selectionStart, setSelectionStart] = useState(0);
    const [selectionEnd, setSelectionEnd] = useState(0);

    function saveSelectionRange(e: React.SyntheticEvent<HTMLInputElement>) {
        setSelectionStart((e.target as HTMLInputElement).selectionStart ?? 0);
        setSelectionEnd((e.target as HTMLInputElement).selectionEnd ?? 0);
    }

    useEffect(() => {
        if (!ref) {
            return;
        }

        ref.selectionStart = selectionStart;
        ref.selectionEnd = selectionEnd;
    }, [ref, selectionEnd, selectionStart, value]);

    return {
        saveSelectionRange,
        setRef
    };
}
