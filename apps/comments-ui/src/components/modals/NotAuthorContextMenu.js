import React, {useContext} from 'react';
import AppContext from '../../AppContext';

const NotAuthorContextMenu = (props) => {
    const {dispatchAction} = useContext(AppContext);

    const openModal = () => {
        dispatchAction('openPopup', {
            type: 'reportDialog',
            comment: props.comment
        });
        props.close();
    };

    return (
        <div className="flex flex-col">
            <button className="w-full text-left text-[14px]" onClick={openModal}>
                <span>Report </span><span className="hidden sm:inline">comment</span>
            </button>
        </div>
    );
};

export default NotAuthorContextMenu;
