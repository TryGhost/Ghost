import React, {useContext} from 'react';
import AppContext from '../../../AppContext';

const NotAuthorContextMenu = ({comment, close}) => {
    const {dispatchAction} = useContext(AppContext);

    const openModal = () => {
        dispatchAction('openPopup', {
            type: 'reportPopup',
            comment
        });
        close();
    };

    return (
        <div className="flex flex-col">
            <button type="button" className="w-full text-left text-[14px]" onClick={openModal}>
                <span>Report </span><span className="hidden sm:inline">comment</span>
            </button>
        </div>
    );
};

export default NotAuthorContextMenu;
