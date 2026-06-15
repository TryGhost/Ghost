import {useRef, useState, type ChangeEvent, type FormEvent, type ReactElement} from 'react';
import type {Services} from '../../../types';
import type {MembersApiClient, SendMagicLinkResponse} from '../../api-client';
import {cn} from '../../cn';
import {CloseButton} from '../buttons/CloseButton';
import {EnvelopeIcon} from './EnvelopeIcon';
import {InboxLinkButton} from './InboxLinkButton';
import {isIos} from '../../ua';

export interface MagicLinkSentState {
    email: string;
    otcRef: string | null;
    inboxLinks: SendMagicLinkResponse['inboxLinks'];
}

interface Props {
    services: Services;
    api: MembersApiClient;
    sent: MagicLinkSentState;
    emailType: 'signin' | 'signup';
    /** Overrides the default per-emailType description (e.g. gift redemption copy). */
    description?: string;
    onClose(): void;
    onSignedIn(): void;
}

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

export function MagicLinkSent({services, api, sent, emailType, description: descriptionOverride, onClose, onSignedIn}: Props): ReactElement {
    const t = services.t;
    const [otc, setOtc] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const submittedRef = useRef(false);

    const submittedEmailOrInbox = sent.email || t('your inbox');

    let description: string;
    if (descriptionOverride) {
        description = descriptionOverride;
    } else if (emailType === 'signup') {
        description = t("To complete signup, click the confirmation link in your inbox. If it doesn't arrive within 3 minutes, check your spam folder!");
    } else if (sent.otcRef) {
        description = t(
            'If you have an account, an email has been sent to {submittedEmailOrInbox}. Click the link inside or enter your code below.',
            {submittedEmailOrInbox}
        );
    } else {
        description = t("If you have an account, a login link has been sent to your inbox. If it doesn't arrive in 3 minutes, be sure to check your spam folder.");
    }

    async function verify(code: string): Promise<void> {
        if (!sent.otcRef || !code.trim() || submittedRef.current) return;
        submittedRef.current = true;
        setVerifying(true);
        setError('');
        try {
            const integrityToken = await api.member.getIntegrityToken();
            const resp = await api.member.verifyOTC({otc: code.trim(), otcRef: sent.otcRef, integrityToken});
            if (resp.redirectUrl) {
                window.location.assign(resp.redirectUrl);
                return;
            }
            const member = await api.member.sessionData();
            if (member) {
                services.setMember({
                    id: member.id,
                    uuid: member.uuid,
                    email: member.email,
                    name: member.name,
                    status: member.status
                });
            }
            onSignedIn();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to verify code, please try again'));
            submittedRef.current = false;
        } finally {
            setVerifying(false);
        }
    }

    function handleOtcChange(e: ChangeEvent<HTMLInputElement>): void {
        const numeric = e.target.value.replace(/[^0-9]/g, '');
        setOtc(numeric);
        if (numeric.length === 6) {
            void verify(numeric);
        }
    }

    function handleOtcSubmit(e: FormEvent): void {
        e.preventDefault();
        if (!otc.trim()) {
            setError(t('Enter code above'));
            return;
        }
        void verify(otc);
    }

    const showInboxLink = sent.inboxLinks && !isIos(navigator) && otc.length === 0;

    return (
        <div className="gh:relative">
            <CloseButton onClick={onClose} t={t} />

            <header className="gh:flex gh:flex-col gh:items-center gh:gap-4 gh:mb-6">
                <EnvelopeIcon className="gh:w-11 gh:h-11 gh:text-[#15171a]" />
                <h1 className="gh:m-0 gh:text-center gh:text-[32px] gh:font-bold gh:leading-tight gh:text-[#15171a]">
                    {t('Now check your email!')}
                </h1>
                <p className="gh:m-0 gh:text-center gh:text-[14px] gh:leading-snug gh:text-[#3d3d3d] gh:max-w-[360px]">
                    {description}
                </p>
            </header>

            {sent.otcRef && (
                <form onSubmit={handleOtcSubmit} className="gh:mb-4">
                    <div className={cn(
                        'gh:flex gh:items-center gh:justify-center gh:rounded-lg gh:border gh:transition-colors',
                        error ? 'gh:border-[#e23a31] gh:shadow-[0_0_0_3px_rgba(255,0,0,0.1)]' : 'gh:border-[#dadee2] gh:focus-within:border-[#a8adb4]'
                    )}>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            autoComplete="one-time-code"
                            autoFocus
                            aria-label={t('Code')}
                            placeholder="––––––"
                            value={otc}
                            onChange={handleOtcChange}
                            className="gh:w-[15ch] gh:bg-transparent gh:border-0 gh:py-3 gh:px-2 gh:font-mono gh:text-[28px] gh:font-light gh:tracking-[1ch] gh:outline-none gh:text-[#15171a]"
                        />
                    </div>
                    {error && (
                        <p className="gh:m-0 gh:mt-2 gh:text-center gh:text-[13px] gh:text-[#e23a31]">{error}</p>
                    )}
                </form>
            )}

            {showInboxLink && sent.inboxLinks ? (
                <InboxLinkButton inboxLinks={sent.inboxLinks} t={t} />
            ) : (
                <button type="button" disabled={verifying} className={PRIMARY_BTN} onClick={onClose}>
                    {verifying ? t('Verifying...') : t('Close')}
                </button>
            )}
        </div>
    );
}
