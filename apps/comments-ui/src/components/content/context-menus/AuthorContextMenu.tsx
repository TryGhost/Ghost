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
        dispatchAction('deleteComment', comment);
        close();
    };

    return (
        <div className="flex flex-col">
            <button className="mb-3 w-full text-left text-[14px]" data-testid="edit" type="button" onClick={toggleEdit}>
                {t('Edit')}
            </button>
            <button className="w-full text-left text-[14px] text-red-600" type="button" onClick={deleteComment}>
                {t('Delete')}
            </button>
        </div>
    );
};

export default AuthorContextMenu;
