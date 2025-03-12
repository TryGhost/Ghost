import React, {ReactNode} from 'react';

const Header:React.FC<{children?: ReactNode}> = ({children}) => {
    return (
        <div className='flex w-full items-baseline justify-between'>
            {children}
        </div>
    );
};

export default Header;
