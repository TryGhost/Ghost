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
                Report comment
            </button>
        </div>
    );
};

export default NotAuthorContextMenu;
