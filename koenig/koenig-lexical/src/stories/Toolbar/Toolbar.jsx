import React from 'react';
import PropTypes from 'prop-types';

import {ToolbarButton} from './ToolbarButton';
import {ToolbarButtonSeparator} from './ToolbarButtonSeparator';

export const Toolbar = ({selection}) => {
    let ToolbarSelection;

    switch (selection) {
    case 'gallery':
        ToolbarSelection = GallerySelection;
        break;
    case 'image':
        ToolbarSelection = ImageSelection;
        break;
    case 'text':
    default:
        ToolbarSelection = TextSelection;
        break;
    }

    return (
        <div className="max-w-fit">
            <ul className="m-0 flex items-center justify-evenly rounded bg-black px-1 py-0 font-sans text-md font-normal text-white">
                <ToolbarSelection />
            </ul>
        </div>
    );
};

Toolbar.propTypes = {
    selection: PropTypes.oneOf(['text', 'image', 'gallery'])
};

Toolbar.defaultProps = {
    selection: 'text'
};

const TextSelection = () => {
    return (
        <>
            <ToolbarButton icon='bold' />
            <ToolbarButton icon='italic' />
            <ToolbarButton icon='headingOne' />
            <ToolbarButton icon='headingOne' />
            <ToolbarButtonSeparator />
            <ToolbarButton icon='link' />
            <ToolbarButton icon='quote' />
            <ToolbarButtonSeparator />
            <ToolbarButton icon='snippet' />
        </>
    );
};

const ImageSelection = () => {
    return (
        <>
            <ToolbarButton icon='imgRegular' />
            <ToolbarButton icon='imgWide' />
            <ToolbarButton icon='imgFull' />
            <ToolbarButtonSeparator />
            <ToolbarButton icon='link' />
            <ToolbarButton icon='replace' />
            <ToolbarButtonSeparator />
            <ToolbarButton icon='snippet' />
        </>
    );
};

const GallerySelection = () => {
    return (
        <>
            <ToolbarButton icon='add' />
            <ToolbarButtonSeparator />
            <ToolbarButton icon='snippet' />
        </>
    );
};
