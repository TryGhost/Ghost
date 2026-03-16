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
        // Use the registered custom element class from the registry instead of
        // the imported Picker class directly. When multiple copies of the bundle
        // are loaded (e.g. UMD + ESM in Ghost's dev environment), only the first
        // copy's class gets registered with customElements.define(). Instantiating
        // an unregistered class throws "Illegal constructor".
        const RegisteredPicker = customElements.get('em-emoji-picker') || Picker;
        const newInstance = new (RegisteredPicker as unknown as new (opts: unknown) => {update: (props: Record<string, unknown>) => void; shadowRoot?: ShadowRoot | null})({...props, ref});

        // emoji-mart renders into an open shadow root and injects its own stylesheet
        // as the first child, so light-DOM rules can't reach the search input.
        // Appending ours here lets it win on source order at equal specificity.
        if (newInstance.shadowRoot) {
            const style = document.createElement('style');
            style.textContent = shadowStyles;
            newInstance.shadowRoot.appendChild(style);
        }

        setInstance(newInstance);

        return () => {
            setInstance(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return React.createElement('div', {ref});
}
