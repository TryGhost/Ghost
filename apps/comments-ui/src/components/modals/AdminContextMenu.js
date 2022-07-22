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
                        Show comment
                    </button> 
                    : 
                    <button className="w-full text-left text-[14px]" onClick={hideComment}>
                        Hide comment
                    </button>
            }
        </div>
    );
};

export default AdminContextMenu;
