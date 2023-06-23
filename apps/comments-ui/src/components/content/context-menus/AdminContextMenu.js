import AppContext from '../../../AppContext';
import React, {useContext} from 'react';

const AdminContextMenu = ({comment, close}) => {
    const {dispatchAction} = useContext(AppContext);

    const hideComment = () => {
        dispatchAction('hideComment', comment);
        close();
    };

    const showComment = () => {
        dispatchAction('showComment', comment);
        close();
    };

    const isHidden = comment.status !== 'published';

    return (
        <div className="flex flex-col">
            {
                isHidden ? 
                    <button className="w-full text-left text-[14px]" type="button" onClick={showComment}>
                        <span>Show </span><span className="hidden sm:inline">comment</span>
                    </button> 
                    : 
                    <button className="w-full text-left text-[14px]" type="button" onClick={hideComment}>
                        <span>Hide </span><span className="hidden sm:inline">comment</span>
                    </button>
            }
        </div>
    );
};

export default AdminContextMenu;
