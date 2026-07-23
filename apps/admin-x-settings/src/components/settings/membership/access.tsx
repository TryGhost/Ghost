import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Banner, Combobox, ComboboxContent, ComboboxTrigger, ComboboxValue, Field, FieldDescription, FieldError, FieldLabel, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, MultiSelectCombobox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator, Button as ShadeButton} from '@tryghost/shade/components';
import {RefreshCw} from 'lucide-react';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {getSettingValues, isSettingReadOnly, useRegenerateAccessCode} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useGlobalData} from '../../providers/global-data-provider';
import {useLimiter} from '../../../hooks/use-limiter';
import {withErrorBoundary} from '../../error-boundary';

const SITE_VISIBILITY_OPTIONS = [
    {
        value: 'public',
        label: 'Public',
        hint: 'Anyone can visit and read the website'
    },
    {
        value: 'private',
        label: 'Private',
        hint: 'Access code required'
    }
];

const MEMBERS_SIGNUP_ACCESS_OPTIONS = [
    {
        value: 'all',
        label: 'Public',
        hint: 'Anyone can sign up and log in'
    },
    {
        value: 'paid',
        label: 'Paid-members only',
        hint: 'A paid Stripe subscription is required to sign up'
    },
    {
        value: 'invite',
        label: 'Invite-only',
        hint: 'People can sign in but won\'t be able to sign up'
    },
    {
        value: 'none',
        label: 'Nobody',
        hint: 'Disable all member features, including newsletters'
    }
];

const DEFAULT_CONTENT_VISIBILITY_OPTIONS = [
    {
        value: 'public',
        label: 'Public',
        hint: 'All site visitors to your site, no login required'
    },
    {
        value: 'members',
        label: 'Members only',
        hint: 'All logged-in members'
    },
    {
        value: 'paid',
        label: 'Paid-members only',
        hint: 'Only logged-in members with an active Stripe subscription'
    },
    {
        value: 'tiers',
        label: 'Specific tiers',
        hint: 'Members with any of the selected tiers'
    }
];

const COMMENTS_ENABLED_OPTIONS = [
    {
        value: 'all',
        label: 'All members',
        hint: 'Logged-in members'
    },
    {
        value: 'paid',
        label: 'Paid-members only',
        hint: 'Only logged-in members with an active Stripe subscription'
    },
    {
        value: 'off',
        label: 'Nobody',
        hint: 'Disable commenting completely'
    }
];

const DEFAULT_PRELAUNCH_TITLE = 'Pre-launch mode';
const DEFAULT_PRELAUNCH_MESSAGE = 'During your free trial, a private access code is required to browse your site. When you\'re ready to launch, pick a plan to upgrade your account and make everything public.';
const DEFAULT_PRELAUNCH_UPGRADE_URL = '#/pro/billing/plans';

const renderAccessOptions = (options: Array<{value: string; label: string; hint: string}>) => options.map(option => (
    <SelectItem key={option.value} value={option.value}>
        <span className='flex flex-col'>
            <span>{option.label}</span>
            <span className='text-sm text-muted-foreground'>{option.hint}</span>
        </span>
    </SelectItem>
));

const getAccessOptionLabel = (options: Array<{value: string; label: string}>, value: string) => options.find(option => option.value === value)?.label;

const Access: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [tiersOpen, setTiersOpen] = React.useState(false);
    const {settings, config} = useGlobalData();
    const limiter = useLimiter();
    const isTrialMode = limiter?.isDisabled('publicSiteAccess');
    const publicSiteAccessLimit = config.hostSettings?.limits?.publicSiteAccess;
    const preLaunchTitle = publicSiteAccessLimit?.title || DEFAULT_PRELAUNCH_TITLE;
    const preLaunchMessage = publicSiteAccessLimit?.error || DEFAULT_PRELAUNCH_MESSAGE;
    const preLaunchUpgradeUrl = publicSiteAccessLimit?.upgradeUrl || DEFAULT_PRELAUNCH_UPGRADE_URL;
    const isPrivateLocked = isSettingReadOnly(settings, 'is_private') || isSettingReadOnly(settings, 'password');
    const {mutateAsync: regenerateAccessCode} = useRegenerateAccessCode();
    const [isRegenerating, setIsRegenerating] = React.useState(false);
    const {
        localSettings,
        isEditing,
        saveState,
        siteData,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange,
        errors,
        clearError
    } = useSettingGroup({
        onValidate: () => {
            if (isPrivate && !password) {
                return {
                    password: 'Enter an access code'
                };
            }

            return {};
        }
    });

    const [isPrivate, password, membersSignupAccess, defaultContentVisibility, defaultContentVisibilityTiers, commentsEnabled] = getSettingValues(localSettings, [
        'is_private', 'password', 'members_signup_access', 'default_content_visibility', 'default_content_visibility_tiers', 'comments_enabled'
    ]) as [boolean, string, string, string, string, string];
    const [savedIsPrivate, savedPublicHash] = getSettingValues(settings, ['is_private', 'public_hash']) as [boolean, string];
    const effectiveIsPrivate = isPrivateLocked ? true : isPrivate;

    const {data: {tiers} = {}} = useBrowseTiers();

    const tierOptionGroups = [
        {
            label: 'Active Tiers',
            options: tiers?.filter(({active}) => active).map(tier => ({value: tier.id, label: tier.name})) || []
        },
        {
            label: 'Archived Tiers',
            options: tiers?.filter(({active}) => !active).map(tier => ({value: tier.id, label: tier.name})) || []
        }
    ];
    const contentVisibilityTiers = JSON.parse(defaultContentVisibilityTiers || '[]') as string[];
    const tierOptions = tierOptionGroups.flatMap(group => group.options.map(option => ({...option, metadata: {group: group.label}})));
    const selectedTierLabels = tierOptions.filter(option => contentVisibilityTiers.includes(option.value)).map(option => option.label).join(', ');
    const privateRssUrl = (savedIsPrivate && effectiveIsPrivate && siteData?.url && savedPublicHash) ? `${siteData.url.replace(/\/$/, '')}/${savedPublicHash}/rss` : null;

    const setSelectedTiers = (selectedTiers: string[]) => {
        updateSetting('default_content_visibility_tiers', JSON.stringify(selectedTiers));
    };

    const handleRegenerateAccessCode = async () => {
        setIsRegenerating(true);
        try {
            const response = await regenerateAccessCode(null);
            const regeneratedAccessCode = response.settings.find(setting => setting.key === 'password')?.value;

            if (typeof regeneratedAccessCode === 'string') {
                updateSetting('password', regeneratedAccessCode);
                clearError('password');
            }
        } catch {
            toast.error('Could not regenerate access code');
        } finally {
            setIsRegenerating(false);
        }
    };

    const form = (
        <SettingGroupContent className='gap-y-4' columns={1}>
            {isTrialMode && (
                <div className='-m-5 overflow-hidden p-5'>
                    <Banner className='mb-2 flex w-full cursor-default flex-col gap-4 border-0 p-6 pt-5 transition-none hover:translate-y-0 hover:scale-100 hover:shadow-[-7px_-6px_42px_8px_rgb(75_225_226_/_28%),7px_6px_42px_8px_rgb(202_103_255_/_32%)] md:flex-row md:items-center md:justify-between dark:hover:shadow-[-7px_-6px_42px_8px_rgb(75_225_226_/_36%),7px_6px_42px_8px_rgb(202_103_255_/_38%)]' size='lg' variant='gradient'>
                        <div>
                            <div className='text-base font-semibold'>{preLaunchTitle}</div>
                            <div className='mt-2 text-gray-700'>
                                {preLaunchMessage}
                            </div>
                        </div>
                        <ShadeButton className='shrink-0 self-start md:self-center' asChild><a href={preLaunchUpgradeUrl}>Upgrade now</a></ShadeButton>
                    </Banner>
                </div>
            )}
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who should be able to browse your site?</div>
                <div className="w-full md:flex-1">
                    <Field className={isPrivateLocked ? 'relative z-10' : undefined} data-disabled={isPrivateLocked || undefined}>
                        <FieldLabel className='sr-only'>Who should be able to browse your site?</FieldLabel>
                        <Select disabled={isPrivateLocked} value={effectiveIsPrivate ? 'private' : 'public'} onValueChange={(value) => {
                            updateSetting('is_private', value === 'private');
                            handleEditingChange(true);
                        }}>
                            <SelectTrigger aria-label='Who should be able to browse your site?' className='border-transparent bg-muted hover:bg-muted' data-testid='site-visibility-select'><SelectValue>{getAccessOptionLabel(SITE_VISIBILITY_OPTIONS, effectiveIsPrivate ? 'private' : 'public')}</SelectValue></SelectTrigger>
                            <SelectContent>{renderAccessOptions(SITE_VISIBILITY_OPTIONS)}</SelectContent>
                        </Select>
                    </Field>
                </div>
            </div>
            {(effectiveIsPrivate || isPrivateLocked) && (
                <div className="flex flex-col content-center items-center gap-4 md:flex-row md:items-start">
                    <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px] md:pt-3">What access code should visitors use?</div>
                    <div className="w-full md:flex-1">
                        <Field className={isPrivateLocked ? 'relative z-10' : undefined} data-disabled={isPrivateLocked || undefined} data-invalid={Boolean(errors.password) || undefined}>
                            <FieldLabel className='sr-only' htmlFor='site-access-code'>Access code</FieldLabel>
                            <InputGroup className='h-[var(--control-height)] border-transparent bg-muted' data-disabled={isPrivateLocked || undefined} data-invalid={Boolean(errors.password) || undefined}>
                                <InputGroupInput
                                    aria-invalid={Boolean(errors.password) || undefined}
                                    data-testid='site-access-code'
                                    disabled={isPrivateLocked}
                                    id='site-access-code'
                                    placeholder='Enter access code'
                                    value={password || ''}
                                    onChange={(e) => {
                                        updateSetting('password', e.target.value);
                                        handleEditingChange(true);
                                    }}
                                    onKeyDown={() => clearError('password')}
                                />
                                <InputGroupAddon align='inline-end'>
                                    <InputGroupButton
                                        aria-label='Regenerate access code'
                                        data-testid='regenerate-access-code'
                                        disabled={isRegenerating}
                                        size='icon-xs'
                                        onClick={handleRegenerateAccessCode}
                                    >
                                        <RefreshCw aria-hidden={true} />
                                    </InputGroupButton>
                                </InputGroupAddon>
                            </InputGroup>
                            {errors.password && <FieldError>{errors.password}</FieldError>}
                        </Field>
                        {privateRssUrl && !isPrivateLocked && (
                            <FieldDescription className='mt-2'>
                                A private RSS feed is available <a className='text-primary' href={privateRssUrl} rel="noopener noreferrer" target='_blank'>here</a>
                            </FieldDescription>
                        )}
                    </div>
                </div>
            )}
            <Separator />
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who should be able to subscribe to your site?</div>
                <div className="w-full md:flex-1">
                    <Field>
                        <FieldLabel className='sr-only'>Who should be able to subscribe to your site?</FieldLabel>
                        <Select value={membersSignupAccess} onValueChange={(value) => {
                            updateSetting('members_signup_access', value);
                            handleEditingChange(true);
                        }}>
                            <SelectTrigger aria-label='Who should be able to subscribe to your site?' className='border-transparent bg-muted hover:bg-muted' data-testid='subscription-access-select'><SelectValue>{getAccessOptionLabel(MEMBERS_SIGNUP_ACCESS_OPTIONS, membersSignupAccess)}</SelectValue></SelectTrigger>
                            <SelectContent>{renderAccessOptions(MEMBERS_SIGNUP_ACCESS_OPTIONS)}</SelectContent>
                        </Select>
                    </Field>
                </div>
            </div>
            <Separator />
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who should have access to new posts?</div>
                <div className="w-full md:flex-1">
                    <Field>
                        <FieldLabel className='sr-only'>Who should have access to new posts?</FieldLabel>
                        <Select value={defaultContentVisibility} onValueChange={(value) => {
                            updateSetting('default_content_visibility', value);
                            handleEditingChange(true);
                        }}>
                            <SelectTrigger aria-label='Who should have access to new posts?' className='border-transparent bg-muted hover:bg-muted' data-testid='default-post-access-select'><SelectValue>{getAccessOptionLabel(DEFAULT_CONTENT_VISIBILITY_OPTIONS, defaultContentVisibility)}</SelectValue></SelectTrigger>
                            <SelectContent>{renderAccessOptions(DEFAULT_CONTENT_VISIBILITY_OPTIONS)}</SelectContent>
                        </Select>
                    </Field>
                </div>
            </div>
            {defaultContentVisibility === 'tiers' && (
                <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                    <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Select specific tiers</div>
                    <div className="w-full md:flex-1">
                        <Field>
                            <FieldLabel className='sr-only'>Select specific tiers</FieldLabel>
                            <Combobox open={tiersOpen} onOpenChange={setTiersOpen}>
                                <ComboboxTrigger aria-label='Select specific tiers' className='border-transparent bg-muted hover:bg-muted' data-testid='tiers-select'>
                                    <ComboboxValue placeholder={!selectedTierLabels}>{selectedTierLabels || 'Select...'}</ComboboxValue>
                                </ComboboxTrigger>
                                <ComboboxContent>
                                    <MultiSelectCombobox
                                        groupBy={option => option.metadata?.group as string | undefined}
                                        options={tierOptions}
                                        values={contentVisibilityTiers}
                                        onChange={(values) => {
                                            setSelectedTiers(values);
                                            handleEditingChange(true);
                                        }}
                                    />
                                </ComboboxContent>
                            </Combobox>
                        </Field>
                    </div>
                </div>
            )}
            <Separator />
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who can comment on posts?</div>
                <div className="w-full md:flex-1">
                    <Field>
                        <FieldLabel className='sr-only'>Who can comment on posts?</FieldLabel>
                        <Select value={commentsEnabled} onValueChange={(value) => {
                            updateSetting('comments_enabled', value);
                            handleEditingChange(true);
                        }}>
                            <SelectTrigger aria-label='Who can comment on posts?' className='border-transparent bg-muted hover:bg-muted' data-testid='commenting-select'><SelectValue>{getAccessOptionLabel(COMMENTS_ENABLED_OPTIONS, commentsEnabled)}</SelectValue></SelectTrigger>
                            <SelectContent>{renderAccessOptions(COMMENTS_ENABLED_OPTIONS)}</SelectContent>
                        </Select>
                    </Field>
                </div>
            </div>
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='Set up who can browse your site, subscribe, read posts, and comment'
            isEditing={isEditing}
            keywords={keywords}
            navid='members'
            saveState={saveState}
            testId='access'
            title='Access'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {form}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Access, 'Access');
