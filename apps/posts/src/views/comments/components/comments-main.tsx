import React from 'react';

const CommentsMain: React.FC<React.PropsWithChildren> = ({children}) => {
    return (
        <main className='flex min-w-0 flex-col lg:col-start-1 lg:[&_.prose]:max-w-[70ch]'>
            {children}
        </main>
    );
};

export default CommentsMain;
