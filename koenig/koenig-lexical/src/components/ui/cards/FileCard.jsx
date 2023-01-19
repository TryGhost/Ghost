import React from 'react';
import PropTypes from 'prop-types';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ReactComponent as FileUploadIcon} from '../../../assets/icons/kg-file-upload.svg';

function EmptyFileCard() {
    return (
        <MediaPlaceholder
            desc="Click to upload a file"
            icon='file'
            size='xsmall'
        />
    );
}

function PopulatedFileCard({isSelected, title, titlePlaceholder, desc, descPlaceholder, name, size, ...args}) {
    return (
        <div className="flex justify-between rounded border border-grey/30 p-2">
            <div className="flex w-full flex-col justify-center px-2 font-sans" {...args}>
                { (isSelected || title) && <input value={title} placeholder={titlePlaceholder} className="text-lg font-bold tracking-tight text-black" />}
                { (isSelected || desc) && <input value={desc} placeholder={descPlaceholder} className="pb-1 text-[1.6rem] font-normal text-grey-700" />}
                <div className="py-1 text-sm font-medium text-grey-900">
                    {name}
                    <span className="text-grey-700"> • {size}</span>
                </div>
            </div>
            <div className={`flex h-full w-full max-w-[96px] items-center justify-center rounded bg-grey-200 ${((title && desc) || isSelected) ? 'h-[96px]' : (title || desc) ? 'h-[64px]' : 'h-[40px]'}`}>
                <FileUploadIcon className={`text-green transition-all duration-75 ease-in ${((title || desc) || isSelected) ? 'h-6 w-6' : 'h-5 w-5'}`} />
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