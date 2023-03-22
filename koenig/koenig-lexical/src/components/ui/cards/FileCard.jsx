import PropTypes from 'prop-types';
import React from 'react';
import {ReactComponent as FileUploadIcon} from '../../../assets/icons/kg-file-upload.svg';
import {MediaPlaceholder} from '../MediaPlaceholder';

function EmptyFileCard() {
    return (
        <MediaPlaceholder
            desc="Click to upload a file"
            icon='file'
            size='xsmall'
        />
    );
}

function PopulatedFileCard({isEditing, title, titlePlaceholder, desc, descPlaceholder, name, size, ...args}) {
    return (
        <div className="flex justify-between rounded border border-grey/30 p-2">
            <div className="flex w-full flex-col justify-between px-2 font-sans" {...args}>
                <div className="flex flex-col">
                    { (isEditing || title) && <input className="h-[30px] bg-transparent text-lg font-bold leading-none tracking-tight text-black dark:text-grey-200" placeholder={titlePlaceholder} value={title} />}
                    { (isEditing || desc) && <input className="h-[26px] bg-transparent pb-1 text-[1.6rem] font-normal leading-none text-grey-700 placeholder:text-grey-500 dark:text-grey-300 dark:placeholder:text-grey-800" placeholder={descPlaceholder} value={desc} />}
                </div>
                <div className="py-1 text-sm font-medium text-grey-900 dark:text-grey-200">
                    {name}
                    <span className="text-grey-700"> • {size}</span>
                </div>
            </div>
            <div className={`flex w-full max-w-[96px] items-center justify-center rounded bg-grey-200 dark:bg-grey-900 ${((title && desc) || isEditing) ? 'h-[96px]' : (title || desc) ? 'h-[64px]' : 'h-[40px]'}`}>
                <FileUploadIcon className={`text-green transition-all duration-75 ease-in ${((title || desc) || isEditing) ? 'h-6 w-6' : 'h-5 w-5'}`} />
            </div>
        </div>
    );
}

export function FileCard({isPopulated, fileTitle, fileTitlePlaceholder, fileDesc, fileDescPlaceholder, fileName, fileSize, ...args}) {
    if (isPopulated) {
        return (
            <PopulatedFileCard 
                desc={fileDesc}
                descPlaceholder={fileDescPlaceholder}
                name={fileName} 
                size={fileSize}
                title={fileTitle}
                titlePlaceholder={fileTitlePlaceholder}
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