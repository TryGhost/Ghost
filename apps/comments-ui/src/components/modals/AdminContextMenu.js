import React, {useContext} from 'react';
import AppContext from '../../AppContext';

const AdminContextMenu = (props) => {
    const {dispatchAction} = useContext(AppContext);

    const hideComment = (event) => {
        dispatchAction('hideComment', props.comment);
        props.close();
    };

    const showComment = (event) => {
        dispatchAction('showComment', props.comment);
        props.close();
    };

    const isHidden = props.comment.status !== 'published';

    return (
        <div className="flex flex-col">
            {
                isHidden ? 
                    <button className="w-full text-left text-[14px]" onClick={showComment}>
                        <span>Show </span><span className="hidden sm:inline">comment</span>
                    </button> 
                    : 
                    <button className="w-full text-left text-[14px]" onClick={hideComment}>
                        <span>Hide </span><span className="hidden sm:inline">comment</span>
                    </button>
            }
        </div>
    );
};

export default AdminContextMenu;
