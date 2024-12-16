import React from 'react';
import {Comment, useAppContext} from '../../../AppContext';

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

    return (
        <div className="flex w-full flex-col gap-0.5">
            <button className="w-full rounded px-2.5 py-1.5 text-left text-[14px] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700" data-testid="edit" type="button" onClick={toggleEdit}>
                {t('Edit')}
            </button>
            <button className="w-full rounded px-2.5 py-1.5 text-left text-[14px] text-red-600 transition-colors hover:bg-neutral-100 dark:text-red-500 dark:hover:bg-neutral-700" data-testid="delete" type="button" onClick={deleteComment}>
                {t('Delete')}
            </button>
        </div>
    );
};

export default AuthorContextMenu;
