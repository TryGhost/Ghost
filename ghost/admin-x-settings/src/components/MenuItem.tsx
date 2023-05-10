import React from 'react';

interface Props {
    name: string;
}

const MenuItem: React.FC<Props> = ({name}) => {
    return (
        <li><a href="javascript:" className="block px-0 py-1">{name}</a></li>
    );
}

export default MenuItem;