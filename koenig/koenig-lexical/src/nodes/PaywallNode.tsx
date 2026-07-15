import DividerCardIcon from '../assets/icons/kg-card-type-preview.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getRoot, $isElementNode, createCommand} from 'lexical';
import {PaywallNode as BasePaywallNode} from '@tryghost/kg-default-nodes';
import {PaywallCard} from '../components/ui/cards/PaywallCard';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {EditorState, LexicalNode} from 'lexical';
import type {PublicPreviewTier, PublicPreviewVisibility} from '../components/ui/cards/PaywallCard';

export interface InsertPaywallPayload {
    afterNodeKey?: string;
}

export const INSERT_PAYWALL_COMMAND = createCommand<InsertPaywallPayload | undefined>();

export class PaywallNode extends BasePaywallNode {
    static kgMenu = {
        label: 'Public preview',
        desc: 'Attract signups with a public intro',
        Icon: DividerCardIcon,
        insertCommand: INSERT_PAYWALL_COMMAND,
        matches: ['public preview','preview', 'public intro', 'members only', 'paywall'],
        priority: 6,
        shortcut: '/paywall'
    };

    getIcon() {
        return DividerCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <PaywallNodeComponent nodeKey={this.getKey()} />
            </KoenigCardWrapper>
        );
    }
}

function $countPublicPreviews(node: LexicalNode): number {
    const currentNodeCount = node.getType() === 'paywall' ? 1 : 0;
    const childNodeCount = $isElementNode(node)
        ? node.getChildren().reduce((count, child) => count + $countPublicPreviews(child), 0)
        : 0;

    return currentNodeCount + childNodeCount;
}

function $nodeHasContent(node: LexicalNode): boolean {
    if (node.getType() === 'paywall') {
        return false;
    }

    if (node.getTextContent().trim()) {
        return true;
    }

    if ($isElementNode(node) && node.getChildren().some($nodeHasContent)) {
        return true;
    }

    return !['root', 'paragraph', 'heading', 'quote'].includes(node.getType());
}

function publicPreviewIsAtTop(editorState: EditorState, nodeKey: string): boolean {
    return editorState.read(() => {
        const root = $getRoot();
        const rootChildren = root.getChildren();

        if ($countPublicPreviews(root) !== 1) {
            return false;
        }

        const publicPreviewIndex = rootChildren.findIndex(node => node.getKey() === nodeKey);

        if (publicPreviewIndex === -1) {
            return false;
        }

        return !rootChildren.slice(0, publicPreviewIndex).some($nodeHasContent);
    });
}

function PaywallNodeComponent({nodeKey}: {nodeKey: string}) {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [editor] = useLexicalComposerContext();
    const publicPreview = cardConfig?.publicPreview;
    const visibility: PublicPreviewVisibility = publicPreview?.visibility || 'members';
    const selectedTiers: PublicPreviewTier[] = React.useMemo(() => publicPreview?.tiers || [], [publicPreview?.tiers]);
    const [isChangingAccess, setIsChangingAccess] = React.useState(false);
    const [isLoadingTiers, setIsLoadingTiers] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [showTierSelector, setShowTierSelector] = React.useState(false);
    const [availableTiers, setAvailableTiers] = React.useState<PublicPreviewTier[]>([]);
    const [selectedTierIds, setSelectedTierIds] = React.useState<string[]>(selectedTiers.map(tier => tier.id));
    const [error, setError] = React.useState<string | null>(null);
    const [showPlacementWarning, setShowPlacementWarning] = React.useState(() => publicPreviewIsAtTop(editor.getEditorState(), nodeKey));
    const showPlacementWarningRef = React.useRef(showPlacementWarning);

    const canChangeAccess = publicPreview?.canChangeAccess !== false && typeof publicPreview?.onChange === 'function';
    const hasPublicPreviewConfig = !!publicPreview;
    const showAccessEditor = hasPublicPreviewConfig && (visibility === 'public' || isChangingAccess);

    React.useEffect(() => {
        setSelectedTierIds(selectedTiers.map(tier => tier.id));
    }, [selectedTiers]);

    React.useEffect(() => {
        const updatePlacementWarning = (editorState: EditorState) => {
            const nextShowPlacementWarning = publicPreviewIsAtTop(editorState, nodeKey);

            if (nextShowPlacementWarning !== showPlacementWarningRef.current) {
                showPlacementWarningRef.current = nextShowPlacementWarning;
                setShowPlacementWarning(nextShowPlacementWarning);
            }
        };

        updatePlacementWarning(editor.getEditorState());

        return editor.registerUpdateListener(({editorState}) => {
            updatePlacementWarning(editorState);
        });
    }, [editor, nodeKey]);

    const updateAccess = React.useCallback(async (nextVisibility: PublicPreviewVisibility, tiers: PublicPreviewTier[] = []) => {
        setError(null);
        setIsSaving(true);

        try {
            await publicPreview.onChange({visibility: nextVisibility, tiers});
            setShowTierSelector(false);
            setIsChangingAccess(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Post access couldn’t be updated. Try again.');
        } finally {
            setIsSaving(false);
        }
    }, [publicPreview]);

    const loadTiers = React.useCallback(async () => {
        if (availableTiers.length > 0 || typeof publicPreview?.fetchTiers !== 'function') {
            return;
        }

        setIsLoadingTiers(true);
        setError(null);
        try {
            const tiers = await publicPreview.fetchTiers();
            setAvailableTiers(tiers);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Tiers couldn’t be loaded. Try again.');
        } finally {
            setIsLoadingTiers(false);
        }
    }, [availableTiers.length, publicPreview]);

    const closeAccessEditor = React.useCallback(() => {
        setError(null);
        setIsChangingAccess(false);
        setShowTierSelector(false);
        setSelectedTierIds(selectedTiers.map(tier => tier.id));
    }, [selectedTiers]);

    const handleSelectAccess = React.useCallback((nextVisibility: PublicPreviewVisibility) => {
        if (nextVisibility === visibility) {
            closeAccessEditor();
            return;
        }

        if (nextVisibility === 'tiers') {
            setShowTierSelector(true);
            void loadTiers();
            return;
        }

        void updateAccess(nextVisibility);
    }, [closeAccessEditor, loadTiers, updateAccess, visibility]);

    const handleChangeAccess = React.useCallback(() => {
        setIsChangingAccess(true);

        if (visibility === 'tiers') {
            setShowTierSelector(true);
            void loadTiers();
        }
    }, [loadTiers, visibility]);

    const handleToggleTier = React.useCallback((tierId: string) => {
        setSelectedTierIds((currentIds) => {
            return currentIds.includes(tierId)
                ? currentIds.filter(id => id !== tierId)
                : [...currentIds, tierId];
        });
    }, []);

    const handleApplyTiers = React.useCallback(() => {
        const tiers = availableTiers.filter(tier => selectedTierIds.includes(tier.id));
        void updateAccess('tiers', tiers);
    }, [availableTiers, selectedTierIds, updateAccess]);

    let visibilityLabel = 'members';
    if (visibility === 'paid') {
        visibilityLabel = 'paid members';
    } else if (visibility === 'tiers') {
        visibilityLabel = selectedTiers.length === 1 ? selectedTiers[0].name : 'specific tiers';
    }

    return (
        <PaywallCard
            availableTiers={availableTiers}
            canChangeAccess={canChangeAccess}
            error={error}
            isLoadingTiers={isLoadingTiers}
            isSaving={isSaving}
            selectedTierIds={selectedTierIds}
            showAccessEditor={showAccessEditor}
            showPaidAccess={publicPreview?.paidAccessEnabled !== false}
            showPlacementWarning={showPlacementWarning}
            showTierSelector={showTierSelector}
            visibility={visibility}
            visibilityLabel={visibilityLabel}
            onApplyTiers={handleApplyTiers}
            onChangeAccess={handleChangeAccess}
            onSelectAccess={handleSelectAccess}
            onToggleTier={handleToggleTier}
        />
    );
}

export function $createPaywallNode() {
    return new PaywallNode();
}

export function $isPaywallNode(node) {
    return node instanceof PaywallNode;
}
