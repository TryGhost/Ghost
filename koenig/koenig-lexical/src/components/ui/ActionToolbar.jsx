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
    }, [isVisible]);

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
