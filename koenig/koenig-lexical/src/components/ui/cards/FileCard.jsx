import React from 'react';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as FilePlaceholderIcon} from '../../../assets/icons/kg-file-placeholder.svg';

function EmptyFileCard() {
    return (
        <MediaPlaceholder
            desc="Click to upload a file"
            Icon={FilePlaceholderIcon}
            size='small'
        />
    );
}

export function FileCard() {
    return (
        <EmptyFileCard />
    );
}