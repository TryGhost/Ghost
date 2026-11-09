import AppCardIcon from '../assets/icons/kg-card-type-other.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {AppNodeComponent} from './AppNodeComponent';
import {AppNode as BaseAppNode} from '@tryghost/kg-default-nodes';
import {createCommand} from 'lexical';
import type {AppCardProperties} from '../utils/app-cards';

export interface InsertAppCardPayload {
    appId: string;
    card: string;
}

export interface UpdateAppCardPayload {
    nodeKey: string;
    patch: AppCardProperties;
    resolve?: () => void;
    reject?: (error: unknown) => void;
}

export const INSERT_APP_CARD_COMMAND = createCommand<InsertAppCardPayload>('INSERT_APP_CARD_COMMAND');
export const UPDATE_APP_CARD_COMMAND = createCommand<UpdateAppCardPayload>('UPDATE_APP_CARD_COMMAND');

export class AppNode extends BaseAppNode {
    // An app's cards come from its manifest, through `cardConfig.appCards`, so
    // the node has no menu entries of its own.
    static kgMenu = [];

    constructor(dataset = {}, key?: string) {
        super(dataset, key);
    }

    getIcon() {
        return AppCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} wrapperStyle="regular">
                <AppNodeComponent
                    appId={this.__appId as string}
                    card={this.__card as string}
                    css={this.__css as string}
                    height={this.__height as number}
                    html={this.__html as string}
                    nodeKey={this.getKey()}
                    properties={this.__properties as AppCardProperties}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createAppNode(dataset = {}) {
    return new AppNode(dataset);
}

export function $isAppNode(node: unknown): node is AppNode {
    return node instanceof AppNode;
}
