import React from 'react';
import {Comment, useAppContext} from '../../../app-context';
import {ReactComponent as FlagIcon} from '../../../images/icons/flag.svg';

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

    const itemClassName = 'flex w-full items-center gap-3 rounded px-3 py-2 text-left text-[14px] leading-5 text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-700';
    const iconClassName = 'size-4 shrink-0';

    return (
        <div className="flex w-full flex-col gap-0.5">
            <button className={itemClassName} type="button" onClick={openModal}>
                <FlagIcon aria-hidden="true" className={iconClassName} />
                <span className="hidden sm:inline">{t('Report comment')}</span><span className="sm:hidden">{t('Report')}</span>
            </button>
        </div>
    );
};

export default NotAuthorContextMenu;
