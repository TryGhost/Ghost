import React, {useContext} from 'react';
import AppContext from '../../AppContext';

const AuthorContextMenu = (props) => {
    const {dispatchAction} = useContext(AppContext);

    const deleteComment = (event) => {
        dispatchAction('deleteComment', props.comment);
        props.close();
    };

    return (
        <div className="flex flex-col">
            <button className="mb-3 w-full text-left text-[14px]" onClick={props.toggleEdit}>
                Edit
            </button>
            <button className="w-full text-left text-[14px] text-red-600" onClick={deleteComment}>
                Delete
            </button>
        </div>
    );
};

export default AuthorContextMenu;
