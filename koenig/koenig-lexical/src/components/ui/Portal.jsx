import {createPortal} from 'react-dom';

function Portal({children, to = 'koenig-lexical'}) {
    const parent = document.getElementById(to);
    if (!parent) {
        return children;
    }
    return createPortal(children, document.getElementById(to));
}

export default Portal;
