import {createPortal} from 'react-dom';

function Portal({children, to}) {
    const container = to || document.body;
    if (!container) {
        return children;
    }

    function cancelEvents(event) {
        // prevent card from losing selection when interacting with element in portal
        event.stopPropagation();
    }

    return createPortal(
        <div className="koenig-lexical" onMouseDown={cancelEvents}>{children}</div>,
        container
    );
}

export default Portal;
