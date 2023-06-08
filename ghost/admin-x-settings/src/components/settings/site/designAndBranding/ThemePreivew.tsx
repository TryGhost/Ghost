import React from 'react';

const ThemePreview: React.FC = () => {
    const tempURL = window.location.origin;

    return (
        <>
            <iframe height="100%" src={tempURL} title="Temporary Preivew" width="100%" />
        </>
    );
};

export default ThemePreview;