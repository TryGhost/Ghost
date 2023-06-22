import AppContext from '../../../AppContext';
import React, {useContext} from 'react';

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
            <button className="w-full text-left text-[14px]" type="button" onClick={openModal}>
                <span>Report </span><span className="hidden sm:inline">comment</span>
            </button>
        </div>
    );
};

export default NotAuthorContextMenu;
