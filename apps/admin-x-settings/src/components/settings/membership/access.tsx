import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Banner, Separator, Button as ShadeButton} from '@tryghost/shade/components';
import {type GroupBase, type MultiValue} from 'react-select';
import {Hint, MultiSelect, type MultiSelectOption, Select, SettingGroupContent, TextField, showToast} from '@tryghost/admin-x-design-system';
import {RefreshCw} from 'lucide-react';
import {getSettingValues, isSettingReadOnly, useRegenerateAccessCode} from '@tryghost/admin-x-framework/api/settings';
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

const Access: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const limiter = useLimiter();
    const isTrialMode = limiter?.isDisabled('publicSiteAccess');
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

    const tierOptionGroups: GroupBase<MultiSelectOption>[] = [
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
    const selectedTierOptions = tierOptionGroups.flatMap(group => group.options).filter(option => contentVisibilityTiers.includes(option.value));
    const privateRssUrl = (savedIsPrivate && effectiveIsPrivate && siteData?.url && savedPublicHash) ? `${siteData.url.replace(/\/$/, '')}/${savedPublicHash}/rss` : null;

    const setSelectedTiers = (selectedOptions: MultiValue<MultiSelectOption>) => {
        const selectedTiers = selectedOptions.map(option => option.value);
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
            showToast({
                type: 'error',
                title: 'Could not regenerate access code'
            });
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
                            <div className='text-base font-semibold'>Pre-launch mode</div>
                            <div className='mt-2 text-gray-700'>
                                During your free trial, a private access code is required to browse your site. When you&apos;re ready to launch, pick a plan to upgrade your account and make everything public.
                            </div>
                        </div>
                        <ShadeButton className='shrink-0 self-start md:self-center' asChild><a href="#/pro/billing/plans">Upgrade now</a></ShadeButton>
                    </Banner>
                </div>
            )}
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who should be able to browse your site?</div>
                <div className="w-full md:flex-1">
                    <Select
                        containerClassName={isPrivateLocked ? 'relative z-10' : undefined}
                        disabled={isPrivateLocked}
                        options={SITE_VISIBILITY_OPTIONS}
                        selectedOption={SITE_VISIBILITY_OPTIONS.find(option => option.value === (effectiveIsPrivate ? 'private' : 'public'))}
                        testId='site-visibility-select'
                        onSelect={(option) => {
                            updateSetting('is_private', option?.value === 'private');
                            handleEditingChange(true);
                        }}
                    />
                </div>
            </div>
            {(effectiveIsPrivate || isPrivateLocked) && (
                <div className="flex flex-col content-center items-center gap-4 md:flex-row md:items-start">
                    <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px] md:pt-3">What access code should visitors use?</div>
                    <div className="w-full md:flex-1">
                        <TextField
                            containerClassName={isPrivateLocked ? 'relative z-10' : undefined}
                            data-testid='site-access-code'
                            disabled={isPrivateLocked}
                            error={!!errors.password}
                            hint={errors.password}
                            placeholder="Enter access code"
                            rightPlaceholder={(
                                <span className='flex h-full items-center'>
                                    <button
                                        aria-label='Regenerate access code'
                                        className='mr-[5px] flex size-5 cursor-pointer items-center justify-center p-0 text-grey-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-grey-400'
                                        data-testid='regenerate-access-code'
                                        disabled={isRegenerating}
                                        title='Regenerate access code'
                                        type='button'
                                        onClick={handleRegenerateAccessCode}
                                    >
                                        <RefreshCw aria-hidden={true} className='size-3.5' strokeWidth={1.5} />
                                    </button>
                                </span>
                            )}
                            title='Access code'
                            value={password || ''}
                            hideTitle
                            onChange={(e) => {
                                updateSetting('password', e.target.value);
                                handleEditingChange(true);
                            }}
                            onKeyDown={() => clearError('password')}
                        />
                        {privateRssUrl && !isPrivateLocked && (
                            <Hint className='mt-2'>
                                <>A private RSS feed is available <a className='text-green' href={privateRssUrl} rel="noopener noreferrer" target='_blank'>here</a></>
                            </Hint>
                        )}
                    </div>
                </div>
            )}
            <Separator />
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who should be able to subscribe to your site?</div>
                <div className="w-full md:flex-1">
                    <Select
                        options={MEMBERS_SIGNUP_ACCESS_OPTIONS}
                        selectedOption={MEMBERS_SIGNUP_ACCESS_OPTIONS.find(option => option.value === membersSignupAccess)}
                        testId='subscription-access-select'
                        onSelect={(option) => {
                            updateSetting('members_signup_access', option?.value || null);
                            handleEditingChange(true);
                        }}
                    />
                </div>
            </div>
            <Separator />
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who should have access to new posts?</div>
                <div className="w-full md:flex-1">
                    <Select
                        options={DEFAULT_CONTENT_VISIBILITY_OPTIONS}
                        selectedOption={DEFAULT_CONTENT_VISIBILITY_OPTIONS.find(option => option.value === defaultContentVisibility)}
                        testId='default-post-access-select'
                        onSelect={(option) => {
                            updateSetting('default_content_visibility', option?.value || null);
                            handleEditingChange(true);
                        }}
                    />
                </div>
            </div>
            {defaultContentVisibility === 'tiers' && (
                <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                    <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Select specific tiers</div>
                    <div className="w-full md:flex-1">
                        <MultiSelect
                            color='black'
                            options={tierOptionGroups.filter(group => group.options.length > 0)}
                            testId='tiers-select'
                            values={selectedTierOptions}
                            onChange={(selectedOptions) => {
                                setSelectedTiers(selectedOptions);
                                handleEditingChange(true);
                            }}
                        />
                    </div>
                </div>
            )}
            <Separator />
            <div className="flex flex-col content-center items-center gap-4 md:flex-row">
                <div className="w-full max-w-none min-w-[160px] md:w-2/3 md:max-w-[320px]">Who can comment on posts?</div>
                <div className="w-full md:flex-1">
                    <Select
                        options={COMMENTS_ENABLED_OPTIONS}
                        selectedOption={COMMENTS_ENABLED_OPTIONS.find(option => option.value === commentsEnabled)}
                        testId='commenting-select'
                        title=""
                        onSelect={(option) => {
                            updateSetting('comments_enabled', option?.value || null);
                            handleEditingChange(true);
                        }}
                    />
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
