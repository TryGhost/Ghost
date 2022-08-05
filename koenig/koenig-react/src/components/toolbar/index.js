import React from 'react';
import MarkupButton from './MarkupButton';

export default function Toolbar(props) {
    return (
        <ul className={`toolbar-temporary`} >
            <li>
                <MarkupButton {...props} tag={'strong'}/>
            </li>
            <li>
                <MarkupButton {...props} tag={'em'}/>
            </li>
        </ul>
    );
}
