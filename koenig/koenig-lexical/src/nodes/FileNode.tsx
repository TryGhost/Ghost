import FileCardIcon from '../assets/icons/kg-card-type-file.svg?react';
import FileNodeComponent from './FileNodeComponent';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {FileNode as BaseFileNode, type FileData} from '@tryghost/kg-default-nodes';
import {createCommand} from 'lexical';

export type FileNodeData = FileData & {
    triggerFileDialog?: boolean;
    initialFile?: File | null;
};

export const INSERT_FILE_COMMAND = createCommand<FileNodeData>();

export class FileNode extends BaseFileNode {
    __triggerFileDialog: boolean = false;
    __initialFile: File | null = null;

    static kgMenu = [{
        label: 'File',
        desc: 'Upload a downloadable file',
        Icon: FileCardIcon,
        insertCommand: INSERT_FILE_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['file'],
        priority: 15,
        shortcut: '/file'
    }];

    static uploadType = 'file';

    constructor(dataset: FileNodeData = {}, key?: string) {
        super(dataset, key);

        const {triggerFileDialog, initialFile} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = !!(!dataset.src && triggerFileDialog);
        this.__initialFile = initialFile || null;
    }

    getIcon() {
        return FileCardIcon;
    }

    set triggerFileDialog(shouldTrigger: boolean) {
        const writable = this.getWritable();
        writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
            >
                <FileNodeComponent
                    fileDesc={this.fileCaption}
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

export const $createFileNode = (dataset: FileNodeData) => {
    return new FileNode(dataset);
};

export function $isFileNode(node: unknown): node is FileNode {
    return node instanceof FileNode;
}
