import React, {useContext} from 'react';
import AppContext from '../../AppContext';

const NotAuthorContextMenu = (props) => {
    const {dispatchAction} = useContext(AppContext);

    const reportComment = (event) => {
        dispatchAction('reportComment', props.comment);
        props.close();
    };

    return (
        <div className="flex flex-col">
            <button className="text-[14px]" onClick={reportComment}>
                Report comment
            </button>
        </div>
    );
};

export default NotAuthorContextMenu;
