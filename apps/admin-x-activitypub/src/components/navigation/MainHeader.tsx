import React, {ReactNode} from 'react';

interface MainHeaderProps {
    children?: ReactNode;
}

const MainHeader: React.FC<MainHeaderProps> = ({children}) => {
    return (
        <div className='sticky top-0 z-50 border-b border-gray-200 bg-white py-8 dark:border-gray-950 dark:bg-black'>
            <div className='grid h-8 grid-cols-3'>
                {children}
            </div>
        </div>
    );
};

export default MainHeader;
