import {createPortal} from 'react-dom';

function Portal({children, to = 'koenig-lexical'}) {
    return createPortal(children, document.getElementById(to));
}

export default Portal;
