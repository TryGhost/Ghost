import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useFeatureFlag from '../../../hooks/use-feature-flag';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Banner, Separator, SettingGroupContent, TextArea, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const SpamFilters: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const hasTurnstileFlag = useFeatureFlag('turnstile');

    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        errors,
        clearError,
        handleEditingChange
    } = useSettingGroup({
        onValidate: () => {
            const [sitekey, secretKey] = getSettingValues(localSettings, ['turnstile_sitekey', 'turnstile_secret_key']) as string[];
            if (hasTurnstileFlag && !!sitekey !== !!secretKey) {
                const message = 'Enter both a site key and a secret key to enable Turnstile, or clear both to disable it';
                return sitekey ? {turnstileSecretKey: message} : {turnstileSitekey: message};
            }
            return {};
        }
    });

    const [initialBlockedEmailDomainsJSON] = getSettingValues(localSettings, ['blocked_email_domains']) as string[];
    const initialBlockedEmailDomains = JSON.parse(initialBlockedEmailDomainsJSON || '[]') as string[];
    const [blockedEmailDomains, setBlockedEmailDomains] = React.useState(initialBlockedEmailDomains.join('\n'));

    const [turnstileSitekey, turnstileSecretKey] = getSettingValues(localSettings, ['turnstile_sitekey', 'turnstile_secret_key']) as string[];

    const updateBlockedEmailDomainsSetting = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const input = e.target.value;
        setBlockedEmailDomains(input);

        const validEmailDomains = input
            .split(/[\s,]+/) // Split by space, comma, or newline
            .map(domain => domain.trim().toLowerCase().split('@').pop()) // Normalise and keep only the email domain, e.g. 'hello@spam.xyz' -> 'spam.xyz'
            .filter(domain => domain && domain.includes('.')); // Filter out domains without a dot

        updateSetting('blocked_email_domains', JSON.stringify(validEmailDomains));

        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const updateTurnstileSetting = (key: 'turnstile_sitekey' | 'turnstile_secret_key', e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting(key, e.target.value.trim() || null);

        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const hint = (
        <>
            Prevent unwanted signups by blocking email domains. Add one domain per line, e.g., <code>spam.xyz</code> to block signups from email addresses like <code>hello@spam.xyz</code>.
        </>
    );

    const turnstileHint = (
        <>
            Verify member signups and signins with <a className="text-green hover:text-green-400" href="https://developers.cloudflare.com/turnstile/" rel="noreferrer" target="_blank">Cloudflare Turnstile</a>. Create a widget in the Cloudflare dashboard to get a site key and secret key.
        </>
    );

    return (
        <TopLevelGroup
            description='Protect your member signups from spam'
            isEditing={isEditing}
            keywords={keywords}
            navid='spam-filters'
            saveState={saveState}
            testId='spam-filters'
            title='Spam filters'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <TextArea
                    className='h-[86px]'
                    error={!!errors.blockedEmailDomains}
                    hint={errors.blockedEmailDomains || hint}
                    placeholder={`spam.xyz\njunk.com`}
                    resize="vertical"
                    title='Blocked email domains'
                    value={blockedEmailDomains}
                    onChange={updateBlockedEmailDomainsSetting}
                    onKeyDown={() => clearError('spam-filters')}
                />
                {hasTurnstileFlag && (<>
                    <Separator className="border-grey-200 dark:border-grey-900" />
                    <div className="flex flex-col gap-4">
                        <div>
                            <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-400">Cloudflare Turnstile</div>
                            <div className="mt-1 text-xs text-grey-700">{turnstileHint}</div>
                        </div>
                        <Banner color='yellow' data-testid='turnstile-warning'>
                            While Turnstile is enabled, custom or third-party signup forms that post to the members API directly will stop working, and signup forms embedded on other websites only work if those domains are added to the widget&apos;s hostname allowlist in the Cloudflare dashboard.
                        </Banner>
                        <TextField
                            error={!!errors.turnstileSitekey}
                            hint={errors.turnstileSitekey}
                            title='Turnstile site key'
                            value={turnstileSitekey || ''}
                            onChange={(e) => {
                                updateTurnstileSetting('turnstile_sitekey', e);
                            }}
                            onKeyDown={() => clearError('turnstileSitekey')}
                        />
                        <TextField
                            error={!!errors.turnstileSecretKey}
                            hint={errors.turnstileSecretKey}
                            title='Turnstile secret key'
                            type='password'
                            value={turnstileSecretKey || ''}
                            onChange={(e) => {
                                updateTurnstileSetting('turnstile_secret_key', e);
                            }}
                            onKeyDown={() => clearError('turnstileSecretKey')}
                        />
                    </div>
                </>)}
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(SpamFilters, 'Spam Filters');
