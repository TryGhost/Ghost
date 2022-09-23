import React from 'react';

const FloatingButton = (props) => {
    return (
        <div onClick={props.onClick} className="text-grey-500 fixed bottom-4 right-6 z-10 cursor-pointer font-mono text-sm tracking-tight">
            JSON output
        </div>
    );
};

export default FloatingButton;
