import React from 'react';

const FloatingButton = ({isOpen, ...props}) => {
    return (
        <div className={`fixed bottom-4 right-6 z-20 font-mono text-sm tracking-tight text-grey-600 rounded pl-2 py-1 xl:p-0 transition-all ease-in-out duration-200 ${isOpen ? 'bg-transparent' : 'bg-white xl:bg-transparent'}`}>
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
