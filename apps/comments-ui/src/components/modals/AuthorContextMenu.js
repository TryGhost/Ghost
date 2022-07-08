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
            <button className="w-full mb-3 text-left text-[14px]" onClick={props.toggleEdit}>
                Edit
            </button>
            <button className="w-full text-left text-[14px]" onClick={deleteComment}>
                Delete
            </button>
        </div>
    );
};

export default AuthorContextMenu;
