import React, {useEffect, useRef} from 'react';
import shadowStyles from './EmojiPicker.shadow.css?inline';
import {Picker} from 'emoji-mart';

export default function EmojiPicker({setInstanceRef, ...props}) {
    const ref = useRef(null);
    const instance = useRef(null);

    function setInstance(newInstance) {
        instance.current = newInstance;
        setInstanceRef?.(newInstance);
    }

    if (instance.current) {
        instance.current.update(props);
    }

    useEffect(() => {
        const newInstance = new Picker({...props, ref});

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
