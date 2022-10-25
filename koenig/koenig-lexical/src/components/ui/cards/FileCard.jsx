import React from 'react';
import PropTypes from 'prop-types';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as FilePlaceholderIcon} from '../../../assets/icons/kg-file-placeholder.svg';
import {ReactComponent as FileUploadIcon} from '../../../assets/icons/kg-file-upload.svg';

function EmptyFileCard() {
    return (
        <MediaPlaceholder
            desc="Click to upload a file"
            Icon={FilePlaceholderIcon}
            size='small'
        />
    );
}

function PopulatedFileCard({isSelected, title, titlePlaceholder, desc, descPlaceholder, name, size, ...args}) {
    return (
        <div className="flex p-2 border border-grey/30 rounded justify-between">
            <div className="flex flex-col font-sans px-2 w-full justify-center" {...args}>
                { (isSelected || title) && <input value={title} placeholder={titlePlaceholder} className="text-lg text-black font-bold tracking-tight" />}
                { (isSelected || desc) && <input value={desc} placeholder={descPlaceholder} className="text-[1.6rem] text-grey-700 font-normal pb-1" />}
                <div className="text-sm text-grey-900 font-medium py-1">
                    {name}
                    <span className="text-grey-700"> • {size}</span>
                </div>
            </div>
            <div className={`bg-grey-200 w-full max-w-[96px] h-full rounded flex items-center justify-center ${((title && desc) || isSelected) ? 'h-[96px]' : (title || desc) ? 'h-[64px]' : 'h-[40px]'}`}>
                <FileUploadIcon className={`text-green transition-all ease-in duration-75 ${((title || desc) || isSelected) ? 'w-6 h-6' : 'w-5 h-5'}`} />
            </div>
        </div>
    );
}

export function FileCard({isPopulated, fileTitle, fileTitlePlaceholder, fileDesc, fileDescPlaceholder, fileName, fileSize, ...args}) {
    if (isPopulated) {
        return (
            <PopulatedFileCard 
                title={fileTitle}
                titlePlaceholder={fileTitlePlaceholder}
                desc={fileDesc} 
                descPlaceholder={fileDescPlaceholder}
                name={fileName}
                size={fileSize}
                {...args} 
            />
        );
    }
    return (
        <EmptyFileCard />
    );
}

FileCard.propTypes = {
    isPopulated: PropTypes.bool,
    fileTitle: PropTypes.string,
    fileTitlePlaceholder: PropTypes.string,
    fileDesc: PropTypes.string,
    fileDescPlaceholder: PropTypes.string,
    fileName: PropTypes.string,
    fileSize: PropTypes.string
};