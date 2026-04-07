import {useContext, useState} from 'react';
import AppContext from '../../app-context';
import {ReactComponent as GiftIcon} from '../../images/icons/gift.svg';
import CloseButton from '../common/close-button';
import copyTextToClipboard from '../../utils/copy-to-clipboard';

// TODO: wrap strings with t() once copy is finalised
/* eslint-disable i18next/no-literal-string */

export const GiftSuccessStyle = `
    .gh-portal-gift-success .gh-portal-signup-header {
        margin-bottom: 0;
        padding: 0;
    }

    .gh-portal-gift-success .gh-gift-success-icon {
        margin: 24px auto 0;
        text-align: center;
        color: var(--brandcolor);
        width: 56px;
        height: 56px;
    }

    .gh-portal-gift-success .gh-gift-success-icon svg {
        width: 56px;
        height: 56px;
    }

    .gh-portal-gift-success h1.gh-portal-main-title {
        font-size: 32px;
        margin-top: 20px;
    }

    .gh-portal-gift-success .gh-portal-text-center {
        padding: 0 32px;
        margin-top: 20px;
    }

    .gh-portal-gift-success .gh-gift-link-container {
        display: flex;
        align-items: center;
        border: 1px solid var(--grey11);
        border-radius: 8px;
        padding: 4px 4px 4px 16px;
        margin: 20px 24px 0;
        gap: 8px;
    }

    .gh-portal-gift-success .gh-gift-link-url {
        flex: 1;
        font-size: 14px;
        color: var(--grey1);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        user-select: all;
    }

    .gh-portal-gift-success .gh-gift-copy-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--brandcolor);
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: opacity 0.15s ease;
    }

    .gh-portal-gift-success .gh-gift-copy-btn:hover {
        opacity: 0.9;
    }

    .gh-portal-gift-success .gh-gift-copy-btn svg {
        width: 14px;
        height: 14px;
    }

    .gh-portal-gift-success .gh-gift-footer-text {
        padding: 0 32px;
        margin-top: 20px;
        font-size: 13px;
        color: var(--grey7);
        text-align: center;
        line-height: 1.5;
    }
`;

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

const GiftSuccessPage = () => {
    const {site, pageData} = useContext(AppContext);
    const [copied, setCopied] = useState(false);

    const token = pageData?.token;
    const siteUrl = site?.url || '';
    const redeemUrl = `${siteUrl.replace(/\/$/, '')}/#/portal/gift/redeem/${token}`;

    const handleCopy = () => {
        copyTextToClipboard(redeemUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className='gh-portal-content gh-portal-gift-success'>
            <CloseButton />

            <div className="gh-portal-signup-header">
                <div className="gh-gift-success-icon"><GiftIcon /></div>
                <h1 className="gh-portal-main-title">Gift ready to share!</h1>
            </div>
            <p className="gh-portal-text-center">
                Share this link with the recipient to let them redeem their gift membership.
            </p>

            <div className="gh-gift-link-container">
                <span className="gh-gift-link-url">{redeemUrl}</span>
                <button className="gh-gift-copy-btn" onClick={handleCopy} type="button">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>

            <p className="gh-gift-footer-text">
                This link can be redeemed once and expires in 365 days.<br />
                We&apos;ve also sent a confirmation to your email with this link.
            </p>
        </div>
    );
};

export default GiftSuccessPage;
