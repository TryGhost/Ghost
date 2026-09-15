import React, {useState} from 'react';
import TopLevelGroup from '@/settings/components/top-level-group';
import useSettingGroup from '@/settings/hooks/use-setting-group';
import {Button, Field, FieldDescription, FieldLabel, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {SettingGroupContent, SettingGroupValue, SettingGroupValueContent, SettingGroupValueTitle} from '@tryghost/shade/patterns';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useGlobalData} from '@/settings/providers/global-data-context';
import {useSendTestMail} from '@tryghost/admin-x-framework/api/mail';
import {withErrorBoundary} from '@/settings/components/with-error-boundary';

const TRANSPORT_OPTIONS = [
    {label: 'SMTP', value: 'smtp'},
    {label: 'Mailgun', value: 'mailgun'}
];

const MailTransport: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();
    const {config} = useGlobalData();

    const [
        mailTransport,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpSecure,
        mailgunDomain,
        mailgunApiKey
    ] = getSettingValues(localSettings, [
        'mail_transport',
        'mail_smtp_host',
        'mail_smtp_port',
        'mail_smtp_user',
        'mail_smtp_pass',
        'mail_smtp_secure',
        'mailgun_domain',
        'mailgun_api_key'
    ]) as [string | null, string | null, string | null, string | null, string | null, boolean | string | null, string | null, string | null];

    const currentTransport = mailTransport === 'mailgun' ? 'mailgun' : 'smtp';
    const isSecure = smtpSecure === true || smtpSecure === 'true';
    const isMailgunConfigured = Boolean((mailgunDomain && mailgunApiKey) || config?.mailgunIsConfigured);

    const [showPassword, setShowPassword] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const {mutateAsync: sendTestMail} = useSendTestMail();

    const handleSendTest = async () => {
        setIsTesting(true);
        try {
            await sendTestMail({});
            toast.success('Test email sent successfully! Check your inbox.');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Failed to send test email. Verify your configuration.';
            toast.error(msg);
        } finally {
            setIsTesting(false);
        }
    };

    const getStatusDisplay = () => {
        if (currentTransport === 'mailgun') {
            if (isMailgunConfigured) {
                return (
                    <Inline align='center' gap='sm'>
                        <LucideIcon.Check className='size-4 text-state-success' />
                        <span>Mailgun (using newsletter credentials{mailgunDomain ? `: ${mailgunDomain}` : ''})</span>
                    </Inline>
                );
            }
            return (
                <Inline align='center' gap='sm'>
                    <LucideIcon.AlertTriangle className='size-4 text-amber-500' />
                    <span>Mailgun selected (newsletter credentials not configured yet)</span>
                </Inline>
            );
        }

        return (
            <Inline align='center' gap='sm'>
                <LucideIcon.Check className='size-4 text-state-success' />
                <span>SMTP ({smtpHost ? `${smtpHost}:${smtpPort || '587'}` : 'Configuration needed'})</span>
            </Inline>
        );
    };

    const values = (
        <SettingGroupContent>
            <SettingGroupValue>
                <SettingGroupValueTitle>Email transport</SettingGroupValueTitle>
                <SettingGroupValueContent className='mt-1'>
                    {getStatusDisplay()}
                </SettingGroupValueContent>
            </SettingGroupValue>
        </SettingGroupContent>
    );

    const inputs = (
        <SettingGroupContent>
            <Stack gap='md'>
                <Field>
                    <FieldLabel>Transport method</FieldLabel>
                    <Select
                        value={currentTransport}
                        onValueChange={(val) => {
                            updateSetting('mail_transport', val);
                        }}
                    >
                        <SelectTrigger aria-label='Transport method'><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {TRANSPORT_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldDescription>
                        Select whether transactional emails (staff invites, password resets, member signup links) are sent via SMTP or Mailgun.
                    </FieldDescription>
                </Field>

                {currentTransport === 'smtp' && (
                    <>
                        <div className='grid grid-cols-[1fr_120px] gap-x-3 gap-y-4'>
                            <Field>
                                <FieldLabel htmlFor='smtp-host'>SMTP Host</FieldLabel>
                                <Input
                                    id='smtp-host'
                                    placeholder='smtp.example.com'
                                    value={smtpHost ?? ''}
                                    onChange={e => updateSetting('mail_smtp_host', e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='smtp-port'>Port</FieldLabel>
                                <Input
                                    id='smtp-port'
                                    placeholder='587'
                                    value={smtpPort ?? ''}
                                    onChange={e => updateSetting('mail_smtp_port', e.target.value)}
                                />
                            </Field>
                        </div>

                        <div className='grid grid-cols-2 gap-x-3 gap-y-4'>
                            <Field>
                                <FieldLabel htmlFor='smtp-user'>Username</FieldLabel>
                                <Input
                                    id='smtp-user'
                                    placeholder='user@example.com'
                                    value={smtpUser ?? ''}
                                    onChange={e => updateSetting('mail_smtp_user', e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='smtp-pass'>Password</FieldLabel>
                                <div className='relative'>
                                    <Input
                                        id='smtp-pass'
                                        type={showPassword ? 'text' : 'password'}
                                        value={smtpPass ?? ''}
                                        onChange={e => updateSetting('mail_smtp_pass', e.target.value)}
                                    />
                                    <Button
                                        className='absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                                        size='sm'
                                        type='button'
                                        variant='ghost'
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <LucideIcon.EyeOff className='size-4' /> : <LucideIcon.Eye className='size-4' />}
                                    </Button>
                                </div>
                            </Field>
                        </div>

                        <Inline align='center' gap='sm'>
                            <Switch
                                checked={isSecure}
                                id='smtp-secure'
                                onCheckedChange={(checked) => {
                                    updateSetting('mail_smtp_secure', checked ? 'true' : 'false');
                                }}
                            />
                            <FieldLabel htmlFor='smtp-secure'>Use SSL/TLS (Secure)</FieldLabel>
                        </Inline>
                    </>
                )}

                {currentTransport === 'mailgun' && (
                    isMailgunConfigured ? (
                        <div className='rounded-lg border border-border/60 bg-surface-elevated/50 p-4'>
                            <Inline align='center' gap='sm'>
                                <LucideIcon.CheckCircle2 className='size-5 shrink-0 text-state-success' />
                                <Stack gap='xs'>
                                    <span className='text-sm font-medium text-foreground'>
                                        Using newsletter Mailgun configuration
                                    </span>
                                    <span className='text-sm text-muted-foreground'>
                                        Transactional emails will be sent using the Mailgun settings configured for newsletters{mailgunDomain ? ` (${mailgunDomain})` : ''}.
                                    </span>
                                </Stack>
                            </Inline>
                        </div>
                    ) : (
                        <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-4'>
                            <Inline align='center' gap='sm'>
                                <LucideIcon.AlertTriangle className='size-5 shrink-0 text-amber-500' />
                                <Stack gap='xs'>
                                    <span className='text-sm font-medium text-foreground'>
                                        Mailgun is not configured yet
                                    </span>
                                    <span className='text-sm text-muted-foreground'>
                                        To send transactional emails with Mailgun, please configure your Mailgun domain and API key in the Mailgun settings section below.
                                    </span>
                                </Stack>
                            </Inline>
                        </div>
                    )
                )}

                <Inline align='center' className='pt-2' gap='md'>
                    <Button
                        disabled={isTesting || (currentTransport === 'mailgun' && !isMailgunConfigured)}
                        type='button'
                        variant='outline'
                        onClick={() => {
                            void handleSendTest();
                        }}
                    >
                        {isTesting ? (
                            <Inline align='center' gap='xs'>
                                <LucideIcon.Loader2 className='size-4 animate-spin' />
                                Sending...
                            </Inline>
                        ) : (
                            <Inline align='center' gap='xs'>
                                <LucideIcon.Send className='size-4' />
                                Send test email
                            </Inline>
                        )}
                    </Button>
                </Inline>
            </Stack>
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='Configure the outbound email server for transactional and system emails.'
            isEditing={isEditing}
            keywords={keywords}
            navid='mail-transport'
            saveState={saveState}
            testId='mail-transport'
            title='Email transport'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={() => {
                void handleSave();
            }}
        >
            {isEditing ? inputs : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MailTransport, 'Email transport');
