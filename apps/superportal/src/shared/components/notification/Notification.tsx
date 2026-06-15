import type {ReactElement, ReactNode} from 'react';
import {cn} from '../../cn';
import {CloseIcon} from '../../icons/CloseIcon';
import {getGiftRedemptionErrorMessage} from '../../gift';
import type {NotificationOptions, Translator} from '../../../types';

interface Props {
    type: NotificationOptions['type'];
    status: NotificationOptions['status'];
    message?: string;
    giftErrorCode?: string | null;
    firstname?: string;
    siteTitle?: string;
    siteUrl?: string;
    hasMember?: boolean;
    leaving?: boolean;
    onClose(): void;
    onAnimationEnd?(animationName: string): void;
    t: Translator;
}

export function Notification({
    type,
    status,
    message,
    giftErrorCode,
    firstname,
    siteTitle,
    siteUrl,
    hasMember,
    leaving,
    onClose,
    onAnimationEnd,
    t
}: Props): ReactElement {
    const animationClass = leaving ? 'gh-notification-leaving' : 'gh-notification-slidein';
    return (
        <div
            className={cn(
                animationClass,
                'gh:pointer-events-auto gh:absolute gh:top-3 gh:end-3 gh:flex gh:items-start gh:gap-3 gh:w-full gh:max-w-[380px] gh:p-4 gh:rounded-[7px] gh:bg-white gh:text-[#15171a]',
                'gh:shadow-[0_0_1px_0_rgba(0,0,0,0.30),0_51px_40px_0_rgba(0,0,0,0.05),0_15.375px_12.059px_0_rgba(0,0,0,0.03),0_6.386px_5.009px_0_rgba(0,0,0,0.03),0_2.31px_1.812px_0_rgba(0,0,0,0.02)]'
            )}
            onAnimationEnd={(e) => onAnimationEnd?.(e.animationName)}
        >
            {status === 'error'
                ? <WarningFillIcon className="gh:w-[18px] gh:h-[18px] gh:min-w-[18px] gh:mt-0.5 gh:text-[#e23a31]" />
                : <CheckmarkFillIcon className={cn('gh:w-[18px] gh:h-[18px] gh:min-w-[18px] gh:mt-0.5', status === 'warning' ? 'gh:text-[#daa92f]' : 'gh:text-[#30cf43]')} />}
            <div className="gh:flex-1 gh:text-[14px] gh:leading-snug">
                <NotificationText type={type} status={status} message={message} giftErrorCode={giftErrorCode} firstname={firstname} siteTitle={siteTitle} siteUrl={siteUrl} hasMember={hasMember} t={t} />
            </div>
            <button
                type="button"
                aria-label={t('Close')}
                onClick={onClose}
                className="gh:p-0 gh:m-0 gh:bg-transparent gh:border-0 gh:cursor-pointer gh:text-[#666] gh:opacity-80 gh:hover:opacity-100 gh:transition-opacity"
            >
                <CloseIcon className="gh:w-3 gh:h-3" />
            </button>
        </div>
    );
}

interface TextProps {
    type: NotificationOptions['type'];
    status: NotificationOptions['status'];
    message?: string;
    giftErrorCode?: string | null;
    firstname?: string;
    siteTitle?: string;
    siteUrl?: string;
    hasMember?: boolean;
    t: Translator;
}

function NotificationText({type, status, message, giftErrorCode, firstname, siteTitle, siteUrl, hasMember, t}: TextProps): ReactElement {
    if (message) return <p className="gh:m-0">{message}</p>;

    if (type === 'giftRedeem' && status === 'success') {
        return <p className="gh:m-0">{t("Gift redeemed! You're all set.")}</p>;
    }

    if (type === 'giftRedeem' && status === 'error') {
        const {title, subtitle} = getGiftRedemptionErrorMessage(giftErrorCode, t);
        return (
            <p className="gh:m-0">
                <strong>{title}</strong>
                <br />
                {subtitle}
            </p>
        );
    }

    if (type === 'signin' && status === 'success') {
        return (
            <p className="gh:m-0">
                <strong>{firstname ? t('Welcome back, {name}!', {name: firstname}) : t('Welcome back!')}</strong>
                <br />
                {t("You've successfully signed in.")}
            </p>
        );
    }

    if (type === 'signin' && status === 'error') {
        return (
            <p className="gh:m-0">
                {t('Could not sign in. Login link expired.')}
                <br />
                <RetryLink page="signin" siteUrl={siteUrl} t={t} />
            </p>
        );
    }

    if ((type === 'signup' || type === 'signup-paid') && status === 'success') {
        return (
            <p className="gh:m-0">
                {renderWithStrong(
                    t("You've successfully subscribed to <strong>{siteTitle}</strong>", {siteTitle: siteTitle || ''}),
                    siteTitle || ''
                )}
            </p>
        );
    }

    if ((type === 'signup' || type === 'signup-paid') && status === 'error') {
        return (
            <p className="gh:m-0">
                {t('Signup error: Invalid link')}
                <br />
                <RetryLink page="signup" siteUrl={siteUrl} t={t} />
            </p>
        );
    }

    if (type === 'stripe:checkout' && status === 'success') {
        return (
            <p className="gh:m-0">
                {hasMember
                    ? t('Success! Your account is fully activated, you now have access to all content.')
                    : t('Success! Check your email for magic link to sign-in.')}
            </p>
        );
    }

    if (type === 'support' && status === 'success') {
        return <p className="gh:m-0">{t('Thank you for your support!')}</p>;
    }

    if (type === 'stripe:checkout' && status === 'warning') {
        return (
            <p className="gh:m-0">
                {hasMember ? t('Plan upgrade was cancelled.') : t('Plan checkout was cancelled.')}
            </p>
        );
    }

    return <p className="gh:m-0">{status === 'success' ? t('Success') : t('Error')}</p>;
}

function renderWithStrong(translated: string, value: string): ReactNode {
    const parts = translated.split(/<strong>(.*?)<\/strong>/);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part || value}</strong> : <span key={i}>{part}</span>);
}

interface RetryLinkProps {
    page: 'signin' | 'signup';
    siteUrl?: string;
    t: Translator;
}

function RetryLink({page, siteUrl, t}: RetryLinkProps): ReactElement {
    const base = siteUrl || '';
    const href = `${base}${base.endsWith('/') ? '' : '/'}#/portal/${page}`;
    return (
        <a
            href={href}
            target="_parent"
            className="gh:underline gh:text-[#15171a] gh:hover:opacity-80"
        >
            {t('Click here to retry')}
        </a>
    );
}

interface IconProps {
    className?: string;
}

function CheckmarkFillIcon({className}: IconProps): ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
            <path
                fill="currentColor"
                d="M12,0A12,12,0,1,0,24,12,12.014,12.014,0,0,0,12,0Zm6.927,8.2-6.845,9.289a1.011,1.011,0,0,1-1.43.188L5.764,13.769a1,1,0,1,1,1.25-1.562l4.076,3.261,6.227-8.451A1,1,0,1,1,18.927,8.2Z"
            />
        </svg>
    );
}

function WarningFillIcon({className}: IconProps): ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
            <path
                fill="currentColor"
                d="M23.25,23.235a.75.75,0,0,0,.661-1.105l-11.25-21a.782.782,0,0,0-1.322,0l-11.25,21A.75.75,0,0,0,.75,23.235ZM12,20.485a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,12,20.485Zm0-12.25a1,1,0,0,1,1,1V14.7a1,1,0,0,1-2,0V9.235A1,1,0,0,1,12,8.235Z"
            />
        </svg>
    );
}
