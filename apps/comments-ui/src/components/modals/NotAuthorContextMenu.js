import React from 'react';

const NotAuthorContextMenu = (props) => {
    const reportComment = (event) => {
        // report
        props.close();
    };

    return (
        <div className="flex flex-col">
            <button className="text-[14px]" onClick={reportComment}>
                Report comment
            </button>
        </div>
    );
};

export default NotAuthorContextMenu;
