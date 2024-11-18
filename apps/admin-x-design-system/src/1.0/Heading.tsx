import {Button} from '@/components/ui/button';
import React from 'react';

interface HeadingProps {
    children?: React.ReactNode;
}

const Heading: React.FC<HeadingProps> = ({children}) => {
    return (
        <>
            {children}
            <Button>Hello button</Button>
        </>
    );
};

export default Heading;