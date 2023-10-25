import React, {useEffect, useRef} from 'react';
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
        setInstance(new Picker({...props, ref}));

        return () => {
            setInstance(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return React.createElement('div', {ref});
}
