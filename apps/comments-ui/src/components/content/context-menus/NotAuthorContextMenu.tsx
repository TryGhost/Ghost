import React from 'react';
import {Comment, useAppContext} from '../../../AppContext';

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
        <div className="flex w-full flex-col gap-0.5">
            <button className="w-full rounded px-2.5 py-1.5 text-left text-[14px] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700" type="button" onClick={openModal}>
                <span className="hidden sm:inline">{t('Report comment')}</span><span className="sm:hidden">{t('Report')}</span>
            </button>
        </div>
    );
};

export default NotAuthorContextMenu;
