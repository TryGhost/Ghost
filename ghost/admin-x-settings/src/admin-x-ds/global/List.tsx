import Heading from './Heading';
import Hint from './Hint';
import React from 'react';
import Separator from './Separator';

interface ListProps {
    title?: React.ReactNode;
    titleSeparator?: boolean;
    children?: React.ReactNode;
    hint?: React.ReactNode;
    hintSeparator?: boolean;
}

const List: React.FC<ListProps> = ({title, titleSeparator, children, hint, hintSeparator}) => {
    titleSeparator = (titleSeparator === undefined) ? true : titleSeparator;
    hintSeparator = (hintSeparator === undefined) ? true : hintSeparator;

    return (
        <section>
            {title && 
                <div className='flex flex-col gap-1'>
                    <Heading grey={true} level={6}>{title}</Heading>
                    {titleSeparator && <Separator />}
                </div>
            }
            <div className='flex flex-col'>
                {children}
            </div>
            {hint && 
            <>
                {hintSeparator && <Separator />}
                <Hint>{hint}</Hint>
            </>
            }
        </section>
    );
};

export default List;