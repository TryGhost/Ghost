import {useEffect, useRef, useState, type ReactElement, type ReactNode} from 'react';
import {CloseIcon} from '../../shared/icons/CloseIcon';
import {cn} from '../../shared/cn';
import {useShareData, type ShareData} from './use-share-data';
import {BlueskyIcon} from './icons/BlueskyIcon';
import {CheckmarkIcon} from './icons/CheckmarkIcon';
import {EllipsisIcon} from './icons/EllipsisIcon';
import {EmailIcon} from './icons/EmailIcon';
import {FacebookIcon} from './icons/FacebookIcon';
import {LinkedInIcon} from './icons/LinkedInIcon';
import {LinkIcon} from './icons/LinkIcon';
import {ThreadsIcon} from './icons/ThreadsIcon';
import {XIcon} from './icons/XIcon';
import type {Services, Translator} from '../../types';

interface Props {
    services: Services;
    onClose(): void;
}

/**
 * Share modal — feature-and-visual parity with apps/portal/src/components/
 * pages/share/share-modal.js. Tailwind utilities (`gh:` prefix) for layout,
 * a small share.css for the panel-size override and excerpt line-clamp.
 */
export function ShareModal({services, onClose}: Props): ReactElement {
    const data = useShareData();
    const t = services.t;

    return (
        <div className="gh:flex gh:flex-col gh:gap-5">
            <header className="gh:flex gh:items-center gh:justify-between">
                <h2 className="gh:m-0 gh:text-[21px] gh:font-semibold gh:leading-tight gh:text-[#1d1d1d]">
                    {t('Share')}
                </h2>
                <button
                    type="button"
                    aria-label={t('Close')}
                    onClick={onClose}
                    className={cn(
                        'gh:flex gh:h-9 gh:w-9 gh:items-center gh:justify-center',
                        'gh:rounded-md gh:border-0 gh:bg-transparent gh:p-0 gh:text-[#dcdcdc]',
                        'gh:cursor-pointer gh:transition-colors hover:gh:text-[#686868]'
                    )}
                >
                    <CloseIcon className="gh:h-5 gh:w-5" />
                </button>
            </header>

            <PreviewCard data={data} />

            <ActionRow data={data} t={t} />
        </div>
    );
}

// ----------------------------------------------------------------------------
// Preview card
// ----------------------------------------------------------------------------

function PreviewCard({data}: {data: ShareData}): ReactElement {
    const {shareImage, shareTitle, shareExcerpt, shareFavicon, shareSiteName, shareAuthor} = data;

    return (
        <div className="gh:flex gh:flex-col gh:overflow-hidden gh:rounded-xl gh:border gh:border-[#eaeaea]">
            {shareImage ? (
                <img
                    src={shareImage}
                    alt=""
                    className="gh:block gh:aspect-[16/9] gh:w-full gh:bg-[#fbfbfb] gh:object-cover"
                />
            ) : null}
            <div className="gh:flex gh:flex-col gh:gap-4 gh:p-4">
                {shareTitle ? (
                    <h3 className="gh:m-0 gh:text-[19px] gh:font-semibold gh:leading-snug gh:text-[#1d1d1d] [text-wrap:pretty]">
                        {shareTitle}
                    </h3>
                ) : null}
                {shareExcerpt ? (
                    <p
                        className={cn(
                            'gh-share-excerpt',
                            'gh:m-0 gh:-mt-2 gh:text-[15px] gh:leading-snug gh:text-[#7f7f7f] [text-wrap:pretty]'
                        )}
                    >
                        {shareExcerpt}
                    </p>
                ) : null}
                {(shareFavicon || shareSiteName || shareAuthor) ? (
                    <div className="gh:-mt-1 gh:flex gh:min-h-[18px] gh:items-center gh:gap-2 gh:text-[13.5px] gh:leading-tight gh:text-[#474747]">
                        {shareFavicon ? (
                            <img
                                src={shareFavicon}
                                alt=""
                                className="gh:h-4 gh:w-4 gh:flex-none gh:rounded gh:object-cover"
                            />
                        ) : null}
                        <div className="gh:flex gh:min-w-0 gh:items-center gh:gap-1 gh:overflow-hidden gh:whitespace-nowrap">
                            {shareSiteName ? (
                                <span className="gh:min-w-0 gh:overflow-hidden gh:text-ellipsis gh:font-medium">
                                    {shareSiteName}
                                </span>
                            ) : null}
                            {shareSiteName && shareAuthor ? (
                                <span aria-hidden="true" className="gh:flex-none gh:text-[#b5b5b5]">|</span>
                            ) : null}
                            {shareAuthor ? (
                                <span className="gh:min-w-0 gh:overflow-hidden gh:text-ellipsis">
                                    {shareAuthor}
                                </span>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------------
// Action row
// ----------------------------------------------------------------------------

function ActionRow({data, t}: {data: ShareData; t: Translator}): ReactElement {
    const {shareUrl, socialLinks} = data;
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    return (
        <div className="gh:relative gh:flex gh:items-center gh:gap-3">
            <CopyButton shareUrl={shareUrl} t={t} />
            <IconButton href={socialLinks.twitter} aria-label={t('X (Twitter)')}>
                <XIcon className="gh:h-4 gh:w-4 gh:text-[#1d1d1d]" />
            </IconButton>
            <IconButton href={socialLinks.linkedin} aria-label={t('LinkedIn')}>
                <LinkedInIcon className="gh:h-5 gh:w-5" />
            </IconButton>
            <IconButton href={socialLinks.email} aria-label={t('Email')}>
                <EmailIcon className="gh:h-5 gh:w-5 gh:text-[#3d3d3d]" />
            </IconButton>
            <MoreMenu
                t={t}
                socialLinks={socialLinks}
                isOpen={isMoreOpen}
                setOpen={setIsMoreOpen}
            />
        </div>
    );
}

// ----------------------------------------------------------------------------
// Copy button
// ----------------------------------------------------------------------------

const COPY_STATE_MS = 2000;

function CopyButton({shareUrl, t}: {shareUrl: string; t: Translator}): ReactElement {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const handleCopy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            // Clipboard write blocked — silently no-op (matches legacy).
            return;
        }
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPY_STATE_MS);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? t('Copied') : t('Copy link')}
            title={copied ? t('Copied') : t('Copy link')}
            className={cn(
                'gh:flex gh:h-11 gh:flex-1 gh:items-center gh:justify-center gh:gap-2',
                'gh:rounded-lg gh:border-0 gh:px-[14px] gh:text-[15px] gh:text-white gh:cursor-pointer',
                'gh:bg-[var(--ghost-accent-color,#3eb0ef)]'
            )}
        >
            <span
                className={cn(
                    'gh:inline-flex gh:h-5 gh:w-5 gh:items-center gh:justify-center gh:rounded-full',
                    copied ? 'gh:bg-white/15' : ''
                )}
            >
                {copied ? (
                    <CheckmarkIcon className="gh:h-3 gh:w-3 gh:text-white" />
                ) : (
                    <LinkIcon className="gh:h-5 gh:w-5 gh:text-white" />
                )}
            </span>
            <span>{copied ? t('Copied') : t('Copy link')}</span>
        </button>
    );
}

// ----------------------------------------------------------------------------
// Icon button (X / LinkedIn / Email)
// ----------------------------------------------------------------------------

interface IconButtonProps {
    href: string;
    'aria-label': string;
    children: ReactNode;
}

function IconButton({href, 'aria-label': ariaLabel, children}: IconButtonProps): ReactElement {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ariaLabel}
            title={ariaLabel}
            className={cn(
                'gh:flex gh:h-11 gh:items-center gh:justify-center gh:px-4',
                'gh:rounded-lg gh:border gh:border-[#eaeaea] gh:bg-white gh:text-[#3d3d3d]',
                'gh:no-underline gh:transition-colors hover:gh:border-[#dcdcdc]'
            )}
        >
            {children}
        </a>
    );
}

// ----------------------------------------------------------------------------
// More menu
// ----------------------------------------------------------------------------

interface MoreMenuProps {
    t: Translator;
    socialLinks: ShareData['socialLinks'];
    isOpen: boolean;
    setOpen(open: boolean): void;
}

function MoreMenu({t, socialLinks, isOpen, setOpen}: MoreMenuProps): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Click-outside + ESC to close. The capture is attached to the iframe's
    // own document via ownerDocument — a same-origin iframe has its own
    // document context for native event dispatch.
    useEffect(() => {
        if (!isOpen) return undefined;

        const doc = containerRef.current?.ownerDocument || document;

        const onDocClick = (event: MouseEvent): void => {
            const node = containerRef.current;
            if (node && event.target instanceof Node && !node.contains(event.target)) {
                event.stopPropagation();
                event.preventDefault();
                setOpen(false);
            }
        };
        const onDocKey = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') setOpen(false);
        };

        doc.addEventListener('click', onDocClick, true);
        doc.addEventListener('keydown', onDocKey);
        return () => {
            doc.removeEventListener('click', onDocClick, true);
            doc.removeEventListener('keydown', onDocKey);
        };
    }, [isOpen, setOpen]);

    return (
        <div ref={containerRef} className="gh:relative">
            <button
                type="button"
                aria-label={t('More options')}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                title={t('More options')}
                onClick={() => setOpen(!isOpen)}
                className={cn(
                    'gh:flex gh:h-11 gh:items-center gh:justify-center gh:px-4',
                    'gh:rounded-lg gh:border gh:border-[#eaeaea] gh:bg-white gh:text-[#3d3d3d]',
                    'gh:cursor-pointer gh:transition-colors hover:gh:border-[#dcdcdc]'
                )}
            >
                <EllipsisIcon className="gh:h-5 gh:w-5" />
            </button>

            {isOpen ? (
                <div
                    role="menu"
                    aria-label={t('More options')}
                    className={cn(
                        'gh-popover-in',
                        'gh:absolute gh:end-0 gh:bottom-[calc(100%+8px)] gh:z-[2]',
                        'gh:flex gh:min-w-[180px] gh:flex-col gh:rounded-lg gh:border gh:border-[#eaeaea] gh:bg-white gh:p-1.5',
                        'gh:shadow-[0_8px_20px_rgba(0,0,0,0.12)]'
                    )}
                >
                    <MoreMenuItem href={socialLinks.facebook} onClick={() => setOpen(false)}>
                        <FacebookIcon className="gh:h-4 gh:w-4" />
                        {t('Facebook')}
                    </MoreMenuItem>
                    <MoreMenuItem href={socialLinks.threads} onClick={() => setOpen(false)}>
                        <ThreadsIcon className="gh:h-4 gh:w-4" />
                        {t('Threads')}
                    </MoreMenuItem>
                    <MoreMenuItem href={socialLinks.bluesky} onClick={() => setOpen(false)}>
                        <BlueskyIcon className="gh:h-4 gh:w-4" />
                        {t('Bluesky')}
                    </MoreMenuItem>
                </div>
            ) : null}
        </div>
    );
}

interface MoreMenuItemProps {
    href: string;
    onClick(): void;
    children: ReactNode;
}

function MoreMenuItem({href, onClick, children}: MoreMenuItemProps): ReactElement {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={onClick}
            className={cn(
                'gh:flex gh:h-9 gh:items-center gh:gap-2 gh:rounded-md gh:px-2.5',
                'gh:text-[14px] gh:font-medium gh:text-[#333] gh:no-underline',
                'gh:cursor-pointer hover:gh:bg-[#fbfbfb]'
            )}
        >
            {children}
        </a>
    );
}
