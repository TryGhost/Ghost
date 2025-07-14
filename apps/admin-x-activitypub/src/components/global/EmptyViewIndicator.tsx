import React, {ReactNode} from 'react';
export const EmptyViewIcon: React.FC<{children?: ReactNode}> = ({children}) => {
    return (
        <div className='flex max-h-12 max-w-12 grow-0 items-center justify-center rounded-full bg-gray-100 p-3 text-gray-700 dark:bg-gray-925/70 [&_svg]:size-8 [&_svg]:stroke-1'>
            {children}
        </div>
    );
};

export const EmptyViewIndicator: React.FC<{children?: ReactNode}> = ({children}) => {
    return (
        <div className='mx-auto mt-[24vh] flex max-w-[500px] flex-col items-center gap-5 text-center text-gray-700'>
            {children}
        </div>
    );
};
