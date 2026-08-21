import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderArtifactNode} from './artifact-renderer.js';

const artifactProperties = {
    id: {default: ''},
    artifactVersion: {default: 1},
    title: {default: ''},
    description: {default: ''},
    html: {default: '', urlType: 'html'}
} satisfies DecoratorNodePropertyMap;

export type ArtifactData = DecoratorNodeData<typeof artifactProperties>;

export class ArtifactNode extends generateDecoratorNode({
    nodeType: 'artifact',
    properties: artifactProperties,
    defaultRenderFn: renderArtifactNode
}) {}

export function $createArtifactNode(dataset: ArtifactData = {}) {
    return new ArtifactNode(dataset);
}

export function $isArtifactNode(node: unknown): node is ArtifactNode {
    return node instanceof ArtifactNode;
}
