import React from 'react';
import Button from '../Button';

const PageMenu: React.FC = () => {
    return (
        <Button icon='hamburger' iconColorClass='text-black dark:text-white' size='sm' link onClick={() => {
            alert('Clicked on hamburger');
        }} />
    );
};

export default PageMenu;