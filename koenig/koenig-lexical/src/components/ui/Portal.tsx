import KoenigComposerContext from '../../context/KoenigComposerContext';
import React from 'react';
import {createPortal} from 'react-dom';

function Portal({children, to, className, ...props}) {
    const {darkMode} = React.useContext(KoenigComposerContext);

    const container = to || document.body;
    if (!container) {
        return children;
    }

    function cancelEvents(event) {
        // prevent card from losing selection when interacting with element in portal
        event.stopPropagation();
    }

    return createPortal(
        <div className="koenig-lexical" style={{width: 'fit-content'}} data-kg-portal onMouseDown={cancelEvents} {...props}>
            <div className={`${darkMode ? 'dark' : ''} ${className || ''}`}>
                {children}
            </div>
        </div>,
        container
    );
}

export default Portal;
