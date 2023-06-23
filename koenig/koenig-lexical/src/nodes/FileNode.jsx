import FileNodeComponent from './FileNodeComponent';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import React from 'react';
import {FileNode as BaseFileNode} from '@tryghost/kg-default-nodes';
import {ReactComponent as FileCardIcon} from '../assets/icons/kg-card-type-file.svg';
import {createCommand} from 'lexical';

export const INSERT_FILE_COMMAND = createCommand();

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
        matches: ['file'],
        priority: 15
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

    set triggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
            >
                <FileNodeComponent
                    fileDesc={this.filecaption}
                    fileDescPlaceholder={'Enter a description'}
                    fileName={this.fileName}
                    fileSize={this.formattedFileSize}
                    fileSrc={this.src}
                    fileTitle={this.fileTitle}
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
