import React from 'react';

const Watermark = () => {
    return (
        <p className="absolute bottom-4 left-6 font-mono text-sm tracking-tight text-black">
            <span className="pr-1 font-bold tracking-wide">Koenig</span> 
            editor
        </p>
    );
};

export default Watermark;
