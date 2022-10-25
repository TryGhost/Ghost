import React from 'react';
import {createPortal} from 'react-dom';

export function ActionToolbar({containerRef, parentContainerRef, isVisible, children, ...props}) {
    const element = parentContainerRef?.current || document.body;

    const [rect, setRect] = React.useState({
        top: 0,
        left: 0,
        right: 0
    });

    React.useEffect(() => {
        if (containerRef && isVisible) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const top = containerRect.top - element.getBoundingClientRect().top;
            setRect({
                top: top,
                left: containerRect.left,
                right: containerRect.right
            });
        }
    }, [isVisible, containerRef, element]);

    const toolbarStyle = {
        position: 'absolute',
        left: (rect?.right - rect?.left) / 2,
        transform: 'translate(-50%, 0)',
        top: rect?.top - 44,
        zIndex: 1000
    };

    if (isVisible) {
        return createPortal(
            <div style={toolbarStyle} {...props}>
                {children}
            </div>,
            element
        );
    }
}
