import React from 'react';

interface PageToolbarProps {
    children?: React.ReactNode;
}

const PageToolbar: React.FC<PageToolbarProps> = ({children}) => {
    return (
        <>
            {children}
        </>
    );
};

export default PageToolbar;