import React, {useEffect, useRef} from 'react';
import shadowStyles from './EmojiPicker.shadow.css?inline';
import {Picker} from 'emoji-mart';

interface EmojiPickerProps {
    setInstanceRef?: (instance: unknown) => void;
    [key: string]: unknown;
}

export default function EmojiPicker({setInstanceRef, ...props}: EmojiPickerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const instance = useRef<{update: (props: Record<string, unknown>) => void} | null>(null);

    function setInstance(newInstance: {update: (props: Record<string, unknown>) => void} | null) {
        instance.current = newInstance;
        setInstanceRef?.(newInstance);
    }

    if (instance.current && typeof instance.current.update === 'function') {
        instance.current.update(props);
    }

    useEffect(() => {
        const newInstance = new Picker({...props, ref});

        // emoji-mart renders into an open shadow root and injects its own stylesheet
        // as the first child, so light-DOM rules can't reach the search input.
        // Appending ours here lets it win on source order at equal specificity.
        // emoji-mart's declarations lose Picker's HTMLElement base, so its shadowRoot isn't typed
        const shadowRoot = (newInstance as unknown as HTMLElement).shadowRoot;
        if (shadowRoot) {
            const style = document.createElement('style');
            style.textContent = shadowStyles;
            shadowRoot.appendChild(style);
        }

        setInstance(newInstance);

        return () => {
            setInstance(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return React.createElement('div', {ref});
}
