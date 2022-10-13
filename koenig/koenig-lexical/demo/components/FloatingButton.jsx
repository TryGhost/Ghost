import React from 'react';

const FloatingButton = (props) => {
    return (
        <div className="fixed bottom-4 right-6 z-10 font-mono text-sm tracking-tight text-grey-500">
            <button type="button" className="cursor-pointer" onClick={() => props.onClick('json')}>
                JSON output
            </button>
            &nbsp;|&nbsp;
            <button type="button" className="cursor-pointer" onClick={() => props.onClick('tree')}>
                State tree
            </button>
        </div>
    );
};

export default FloatingButton;
