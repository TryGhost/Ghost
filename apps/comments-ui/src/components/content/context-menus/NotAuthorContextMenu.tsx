import React from 'react';
import {useAppContext} from '../../../AppContext';

type Props = {
    comment: Comment;
    close: () => void;
};
const NotAuthorContextMenu: React.FC<Props> = ({comment, close}) => {
    const {dispatchAction, t} = useAppContext();

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
                <span className="hidden sm:inline">{t('Report comment')}</span><span className="sm:hidden">{t('Report')}</span>
            </button>
        </div>
    );
};

export default NotAuthorContextMenu;
