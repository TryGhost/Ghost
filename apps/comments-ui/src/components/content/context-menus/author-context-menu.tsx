import React from 'react';
import {Comment, useAppContext} from '../../../app-context';
import {ReactComponent as PencilIcon} from '../../../images/icons/pencil.svg';
import {ReactComponent as TrashIcon} from '../../../images/icons/trash.svg';

type Props = {
    comment: Comment;
    close: () => void;
    toggleEdit: () => void;
};
const AuthorContextMenu: React.FC<Props> = ({comment, close, toggleEdit}) => {
    const {dispatchAction, t} = useAppContext();

    const deleteComment = () => {
        dispatchAction('openPopup', {
            type: 'deletePopup',
            comment
        });
        close();
    };

    const baseItemClassName = 'flex w-full items-center gap-3 rounded px-3 py-2 text-left text-[14px] leading-5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700';
    const itemClassName = `${baseItemClassName} text-neutral-900 dark:text-white`;
    const destructiveItemClassName = `${baseItemClassName} text-red-600 dark:text-red-500`;
    const iconClassName = 'size-4 shrink-0';

    return (
        <div className="flex w-full flex-col gap-0.5">
            <button className={itemClassName} data-testid="edit" type="button" onClick={toggleEdit}>
                <PencilIcon aria-hidden="true" className={iconClassName} />
                <span>{t('Edit')}</span>
            </button>
            <button className={destructiveItemClassName} data-testid="delete" type="button" onClick={deleteComment}>
                <TrashIcon aria-hidden="true" className={iconClassName} />
                <span>{t('Delete')}</span>
            </button>
        </div>
    );
};

export default AuthorContextMenu;
