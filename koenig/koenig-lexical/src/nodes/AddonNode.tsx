import AddonCardIcon from '../assets/icons/kg-card-type-other.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {AddonNode as BaseAddonNode, normalizeAddonHeight, renderAddonEditorPreview} from '@tryghost/kg-default-nodes';
import {createCommand} from 'lexical';

export const INSERT_ADDON_COMMAND = createCommand();

export function AddonNodeComponent({dataset}) {
    const srcDoc = renderAddonEditorPreview(dataset);
    const height = normalizeAddonHeight(dataset.initialHeight);

    return (
        <div className="relative w-full overflow-hidden" data-kg-addon-preview={dataset.blockName}>
            <iframe
                className="block w-full border-0"
                height={height}
                sandbox=""
                srcDoc={srcDoc}
                style={{height: `${height}px`, pointerEvents: 'none'}}
                tabIndex={-1}
                title={dataset.label || dataset.blockName}
            />
            <div aria-hidden="true" className="absolute inset-0" />
        </div>
    );
}

export class AddonNode extends BaseAddonNode {
    // The installed manifest contributes the user-facing menu entries. Keeping
    // this empty still marks the one generic node as menu-capable.
    static kgMenu = [];

    constructor(dataset = {}, key?) {
        super(dataset, key);
    }

    getIcon() {
        return AddonCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} wrapperStyle="regular">
                <AddonNodeComponent dataset={this.getDataset()} />
            </KoenigCardWrapper>
        );
    }
}

export function $createAddonNode(dataset = {}) {
    return new AddonNode(dataset);
}

export function $isAddonNode(node) {
    return node instanceof AddonNode;
}
