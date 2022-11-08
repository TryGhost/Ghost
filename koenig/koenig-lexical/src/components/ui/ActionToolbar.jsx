import React from 'react';

export function ActionToolbar({isVisible, children, ...props}) {
    const toolbarRef = React.useRef(null);

    const [rect, setRect] = React.useState({
        top: 0,
        left: 0,
        right: 0
    });

    React.useLayoutEffect(() => {
        if (isVisible) {
            const containerRect = toolbarRef.current.parentElement.getBoundingClientRect();
            setRect({
                top: 0,
                left: containerRect.left,
                right: containerRect.right
            });
        }
        // About the cardWidth: this is an optional prop that is passed down the ImageNodeComponent tree from the CardContext. 
        // It's state change is used to fire a re-render of the toolbar when the card width changes (eg when the user resizes the card) to ensure the toolbar is positioned correctly.
    }, [isVisible, props?.cardWidth]);

    const toolbarStyle = {
        position: 'absolute',
        left: (rect?.right - rect?.left) / 2,
        transform: 'translate(-50%, 0)',
        top: rect?.top - 44,
        zIndex: 1000
    };

    if (isVisible) {
        return (
            <div ref={toolbarRef} className="not-kg-prose" style={toolbarStyle} {...props}>
                {children}
            </div>
        );
    }
}
