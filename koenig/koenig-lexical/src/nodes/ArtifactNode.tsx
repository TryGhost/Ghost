import ArtifactCardIcon from '../assets/icons/kg-wand.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {ArtifactNodeComponent} from './ArtifactNodeComponent';
import {ArtifactNode as BaseArtifactNode} from '@tryghost/kg-default-nodes';
import {createCommand} from 'lexical';

export const INSERT_ARTIFACT_COMMAND = createCommand();

export class ArtifactNode extends BaseArtifactNode {
    static kgMenu = {
        label: 'Artifact',
        desc: 'Build an interactive embed',
        Icon: ArtifactCardIcon,
        insertCommand: INSERT_ARTIFACT_COMMAND,
        isHidden: ({config}) => !config?.feature?.designBuilder || !config?.openArtifact,
        matches: ['artifact', 'embed', 'interactive'],
        priority: 19,
        shortcut: '/artifact'
    };

    constructor(dataset = {}, key) {
        super(dataset, key);
    }

    getIcon() {
        return ArtifactCardIcon;
    }

    hasEditMode() {
        return false;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                IndicatorIcon={ArtifactCardIcon}
                nodeKey={this.getKey()}
            >
                <ArtifactNodeComponent
                    artifactVersion={this.__artifactVersion}
                    description={this.__description}
                    html={this.__html}
                    id={this.__id}
                    nodeKey={this.getKey()}
                    title={this.__title}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createArtifactNode(dataset) {
    return new ArtifactNode(dataset);
}

export function $isArtifactNode(node) {
    return node instanceof ArtifactNode;
}
