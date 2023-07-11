import React from 'react';
import {useAppContext} from '../../../AppContext';

type Props = {
    comment: Comment;
    close: () => void;
};
const NotAuthorContextMenu: React.FC<Props> = ({comment, close}) => {
    const {dispatchAction} = useAppContext();

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
