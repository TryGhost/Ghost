import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {DropdownSetting, InputSetting, InputUrlSetting, MultiSelectDropdownSetting, SettingsPanel} from '../components/ui/SettingsPanel';
import {PaywallCard} from '../components/ui/cards/PaywallCard';
import {ToolbarMenu, ToolbarMenuItem} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const POST_ACCESS_OPTIONS = [
    {label: 'Public', name: 'public'},
    {label: 'Members only', name: 'members'},
    {label: 'Paid-members only', name: 'paid'},
    {label: 'Specific tier(s)', name: 'tiers'}
];

const EMPTY_TIERS = [];
const noopSubscribe = () => () => {};
const defaultAccessSnapshot = () => 'members';
const defaultTiersSnapshot = () => EMPTY_TIERS;

const DEFAULT_EMAIL_TITLE = 'Upgrade to continue reading.';
const DEFAULT_EMAIL_BUTTON_TEXT = 'Upgrade';
const DEFAULT_EMAIL_BUTTON_URL = '#/portal/signup';
const EXCLUDED_EMAIL_PAYWALL_LINKS = [
    '#/portal/account/plans',
    '#/portal/gift',
    '#/portal/signup/free',
    '#/share'
];

export function PaywallNodeComponent({
    emailBody = '',
    emailButtonText = '',
    emailButtonUrl = DEFAULT_EMAIL_BUTTON_URL,
    emailTitle = '',
    nodeKey
}) {
    const [editor] = useLexicalComposerContext();
    const {cardWidth, isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const postAccess = cardConfig?.postAccess;
    const defaultEmailBody = cardConfig?.siteTitle
        ? `Become a paid member of ${cardConfig.siteTitle} to get access to all premium content.`
        : 'Become a paid member to get access to all premium content.';

    const access = React.useSyncExternalStore(
        postAccess?.subscribe || noopSubscribe,
        postAccess?.getValue || defaultAccessSnapshot,
        postAccess?.getValue || defaultAccessSnapshot
    );
    const selectedTiers = React.useSyncExternalStore(
        postAccess?.subscribe || noopSubscribe,
        postAccess?.getSelectedTiers || defaultTiersSnapshot,
        postAccess?.getSelectedTiers || defaultTiersSnapshot
    );
    const hasPaidAccess = access === 'paid' || access === 'tiers';
    const [availableTiers, setAvailableTiers] = React.useState([]);

    React.useEffect(() => {
        let isCurrent = true;

        if (!isEditing || !postAccess?.fetchTiers) {
            return;
        }

        postAccess.fetchTiers().then((tiers) => {
            if (isCurrent) {
                setAvailableTiers(tiers);
            }
        }).catch(() => {
            if (isCurrent) {
                setAvailableTiers([]);
            }
        });

        return () => {
            isCurrent = false;
        };
    }, [isEditing, postAccess]);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    const handleAccessChange = (value) => {
        postAccess?.onChange?.(value);
    };

    const handleTiersChange = (tierNames) => {
        const tiers = tierNames.map(name => availableTiers.find(tier => tier.name === name)).filter(Boolean);
        postAccess?.onTiersChange?.(tiers);
    };

    const handleEmailSettingChange = property => (event) => {
        const value = event.target.value;
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) {
                node[property] = value;
            }
        });
    };

    const handleEmailButtonUrlChange = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) {
                node.emailButtonUrl = value;
            }
        });
    };

    const handleEmailPreview = (event) => {
        event.preventDefault();
        cardConfig?.openFreeEmailPreview?.(event);
    };

    const tabs = [
        {id: 'access', label: 'Access'},
        ...(hasPaidAccess ? [{id: 'content', label: 'Email paywall'}] : [])
    ];

    const contentSettings = (
        <>
            <InputSetting
                dataTestId="paywall-email-title"
                label="Title"
                value={emailTitle || DEFAULT_EMAIL_TITLE}
                onChange={handleEmailSettingChange('emailTitle')}
            />
            <InputSetting
                dataTestId="paywall-email-body"
                label="Body"
                rows={3}
                value={emailBody || defaultEmailBody}
                onChange={handleEmailSettingChange('emailBody')}
            />
            <InputSetting
                dataTestId="paywall-email-button-text"
                label="Button"
                value={emailButtonText || DEFAULT_EMAIL_BUTTON_TEXT}
                onChange={handleEmailSettingChange('emailButtonText')}
            />
            <InputUrlSetting
                dataTestId="paywall-email-button-url"
                excludedValues={EXCLUDED_EMAIL_PAYWALL_LINKS}
                label="Button URL"
                value={emailButtonUrl}
                onChange={handleEmailButtonUrlChange}
            />
            {cardConfig?.openFreeEmailPreview && (
                <div
                    className="-mx-6 -mb-6 mt-1 flex rounded-b-lg border-t border-grey-200 bg-grey-50 px-6 py-4 dark:border-grey-900 dark:bg-grey-925"
                    data-testid="paywall-email-preview-footer"
                >
                    <button
                        className="text-left text-sm font-semibold text-green-600 hover:text-green-500"
                        data-testid="paywall-email-preview-link"
                        type="button"
                        onClick={handleEmailPreview}
                    >
                        Preview email paywall
                    </button>
                </div>
            )}
        </>
    );

    const accessSettings = (
        <>
            <DropdownSetting
                dataTestId="paywall-post-access"
                description="Choose who can read the full post. Everyone else can only read the public preview."
                label="Post access"
                menu={POST_ACCESS_OPTIONS}
                value={access}
                onChange={handleAccessChange}
            />
            {access === 'tiers' && (
                <MultiSelectDropdownSetting
                    allowAdd={false}
                    availableItems={availableTiers.map(tier => tier.name)}
                    dataTestId="paywall-post-tiers"
                    hideLabel={true}
                    items={selectedTiers.map(tier => tier.name)}
                    label="Paid tiers"
                    placeholder="Select a tier"
                    onChange={handleTiersChange}
                />
            )}
        </>
    );

    return (
        <>
            <PaywallCard access={access} />

            <ActionToolbar
                data-kg-card-toolbar="paywall"
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem
                        dataTestId="edit-paywall"
                        icon="edit"
                        isActive={false}
                        label="Edit"
                        onClick={handleToolbarEdit}
                    />
                </ToolbarMenu>
            </ActionToolbar>

            {isEditing && (
                <SettingsPanel cardWidth={cardWidth} darkMode={darkMode} defaultTab="access" tabs={tabs}>
                    {{
                        content: contentSettings,
                        access: accessSettings
                    }}
                </SettingsPanel>
            )}
        </>
    );
}
