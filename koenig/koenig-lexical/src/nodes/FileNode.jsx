import KoenigCardWrapper from '../components/KoenigCardWrapper';
import React from 'react';

import {FileNode as BaseFileNode, INSERT_FILE_COMMAND} from '@tryghost/kg-default-nodes';

import FileNodeComponent from './FileNodeComponent';
import {ReactComponent as FileCardIcon} from '../assets/icons/kg-card-type-file.svg';
// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_FILE_COMMAND} from '@tryghost/kg-default-nodes';

export class FileNode extends BaseFileNode {
    __triggerFileDialog = false;
    __initialFile = null;

    static kgMenu = [{
        label: 'File',
        desc: 'Upload a downloadable file',
        Icon: FileCardIcon,
        insertCommand: INSERT_FILE_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['file']
    }];

    static uploadType = 'file';

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog, initialFile} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false;
        this.__initialFile = initialFile || null;
    }

    getIcon() {
        return FileCardIcon;
    }

    setTriggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        return writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
            >
                <FileNodeComponent
                    fileDesc={this.getFileCaption()}
                    fileDescPlaceholder={'Enter a description'}
                    fileName={this.getFileName()} 
                    fileSize={this.getFormattedFileSize()}
                    fileSrc = {this.getSrc()}
                    fileTitle={this.getFileTitle()}
                    fileTitlePlaceholder={'Enter a title'}
                    initialFile={this.__initialFile}
                    nodeKey={this.getKey()}
                    triggerFileDialog={this.__triggerFileDialog}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createFileNode = (dataset) => {
    return new FileNode(dataset);
};

export function $isFileNode(node) {
    return node instanceof FileNode;
}
